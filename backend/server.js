// 1. Importaciones - Reorganizadas y ordenadas
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs"); // Movido al inicio con las demás importaciones
require("dotenv").config();

// 2. Configuración inicial
const app = express();
const uploadDir = "./uploads";

// Crear directorio de uploads si no existe
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// 3. Middleware básico
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 4. Configuración CORS
app.use(
  cors({
    origin: '*',
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    exposedHeaders: ["Content-Disposition"], // Importante para descargas
    preflightContinue: false,
  })
);

// En server.js, agregar middleware de logging:
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Body:', req.body);
  console.log('Query:', req.query);
  console.log('Params:', req.params);
  
  // Capturar la respuesta
  const oldSend = res.send;
  res.send = function(data) {
    console.log(`[${new Date().toISOString()}] Response:`, data);
    oldSend.apply(res, arguments);
  };
  
  next();
});


// 5. Middleware de logging
app.use((req, res, next) => {
  console.log("Request URL:", req.url);
  console.log("__dirname:", __dirname);
  next();
});

// 6. Configuración de base de datos
// const connection = mysql.createConnection({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   ssl: {
//     rejectUnauthorized: false
//   }
// });

const connection = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false
  },
  waitForConnections: true,
  connectionLimit: 5,
  maxIdle: 5,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

// Error handler
connection.on('connection', (conn) => {
  conn.on('error', (err) => {
    console.error('Error de conexión:', err);
  });
});

connection.promise().query('SELECT 1')
  .then(() => console.log('Conexión exitosa'))
  .catch(err => console.error('Error:', err));

connection.on('error', (err) => {
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error('Database connection lost');
  }
  if (err.code === 'ECONNRESET') {
    console.error('Database connection reset');
  }
});

// 7. Configuración de Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const cleanFileName = file.originalname.replace(/[^a-zA-Z0-9.]/g, "_");
    cb(null, `${Date.now()}_${cleanFileName}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten archivos PDF"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// 8. Funciones auxiliares
const getNextConsecutive = async () => {
  const [result] = await connection
    .promise()
    .query("SELECT MAX(order_consecutive) as max_consecutive FROM orders");
  const maxConsecutive = result[0].max_consecutive || "0000";
  const nextNumber = parseInt(maxConsecutive, 10) + 1;
  return nextNumber.toString().padStart(4, "0");
};

app.get('/orders/:id', async (req, res) => {
  try {
    const [orders] = await connection.promise().query(
      `SELECT 
        o.*,
        c.name as client_name,
        c.document_type as client_document_type,
        c.document_number as client_document_number
      FROM orders o
      LEFT JOIN clients c ON o.client_id = c.id
      WHERE o.id = ?`,
      [req.params.id]
    );

    if (!orders.length) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    // Agregar los campos faltantes
    const orderData = {
      ...orders[0],
      document_type: orders[0].document_type,
      order_consecutive: orders[0].order_consecutive,
    };

    // 2. Obtener items con información del proveedor
    const [items] = await connection.promise().query(
      `SELECT 
        oi.*,
        p.id as providerId,
        p.name as providerName,
        p.document_type as providerDocumentType,
        p.document_number as providerDocumentNumber
      FROM order_items oi
      LEFT JOIN providers p ON oi.provider_id = p.id
      WHERE oi.order_id = ?`,
      [req.params.id]
    );

    // 3. Obtener archivos
    const [files] = await connection.promise().query(
      'SELECT * FROM order_files WHERE order_id = ?',
      [req.params.id]
    );

    const response = {
      ...orders[0],
      items: items.map(item => ({
        ...item,
        description: item.details,
        provider_name: item.providerName,
        provider_id: item.providerId,
        unit_price: item.unit_price,
        noIva: item.iva === 0
      })),
      files: files
    };

    console.log('Respuesta completa:', response);
    res.json(response);

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// En server.js, modificar el endpoint GET /orders
app.get("/orders", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = `
      SELECT 
        o.*,
        c.name as client_name,
        p.name as provider_name,
        oi.details as item_details
      FROM orders o
      LEFT JOIN clients c ON o.client_id = c.id
      LEFT JOIN providers p ON o.provider_id = p.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
    `;

    const queryParams = [];

    if (startDate && endDate) {
      query += ` WHERE DATE(o.created_at) BETWEEN DATE(?) AND DATE(?)`;
      queryParams.push(startDate, endDate);
    }

    query += ` ORDER BY o.created_at DESC`;

    const [orders] = await connection.promise().query(query, queryParams);

    const formattedOrders = orders.map((order) => ({
      ...order,
      items: [
        {
          id: order.id,
          details: order.item_details || order.details,
          quantity: order.quantity,
          unit_price: order.unit_price,
          subtotal: order.subtotal,
          iva: order.iva,
          total: order.total,
          provider_name: order.provider_name,
          provider_invoice: order.provider_invoice,
        },
      ],
    }));

    res.json(formattedOrders);
  } catch (error) {
    console.error("Backend - Error SQL:", error);
    res.status(500).json({ error: "Error al obtener órdenes" });
  }
});

// 9. Endpoints de diagnóstico y archivos
app.get("/debug-files", async (req, res) => {
  try {
    const [files] = await connection
      .promise()
      .query("SELECT * FROM order_files");
    const uploadsDir = path.join(__dirname, "uploads");
    const physicalFiles = fs.readdirSync(uploadsDir);

    res.json({
      databaseFiles: files,
      physicalFiles,
      serverInfo: {
        uploadsPath: uploadsDir,
        exists: fs.existsSync(uploadsDir),
        isDirectory: fs.statSync(uploadsDir).isDirectory(),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint mejorado para servir archivos
app.get("/files/:id", async (req, res) => {
  console.log("Accediendo a archivo con ID:", req.params.id);

  try {
    const [files] = await connection
      .promise()
      .query("SELECT * FROM order_files WHERE id = ?", [req.params.id]);

    if (!files || files.length === 0) {
      console.log("No se encontró el archivo en la base de datos");
      return res.status(404).send("Archivo no encontrado en la base de datos");
    }

    const file = files[0];
    console.log("Archivo encontrado en BD:", file);

    let filePath = path.join(__dirname, file.file_path);
    console.log("Intentando acceder al archivo en:", filePath);

    if (!fs.existsSync(filePath)) {
      // Intenta buscar en la carpeta uploads directamente
      filePath = path.join(__dirname, "uploads", file.file_name);
      console.log("Intentando ruta alternativa:", filePath);

      if (!fs.existsSync(filePath)) {
        return res.status(404).send("Archivo no encontrado");
      }
    }

    res.contentType("application/pdf");
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error("Error completo:", error);
    res.status(500).send("Error interno del servidor");
  }
});

// 10. Endpoints principales
//Login endpoint
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  connection.query(
    "SELECT * FROM users WHERE email = ? AND password = ?",
    [email, password],
    (error, results) => {
      if (error) return res.status(500).json({ error: "Error servidor" });
      if (results.length > 0) {
        res.json({ user: results[0] });
      } else {
        res.status(401).json({ error: "Credenciales inválidas" });
      }
    }
  );
});



// Endpoints de Clientes
app.get("/clients", async (req, res) => {
  try {
    const [clients] = await connection.promise().query("SELECT * FROM clients");
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener clientes" });
  }
});

app.post("/clients", async (req, res) => {
  const { name, document_type, document_number } = req.body;
  try {
    const [result] = await connection
      .promise()
      .query(
        "INSERT INTO clients (name, document_type, document_number) VALUES (?, ?, ?)",
        [name, document_type, document_number]
      );
    const [newClient] = await connection
      .promise()
      .query("SELECT * FROM clients WHERE id = ?", [result.insertId]);
    res.json(newClient[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al crear cliente" });
  }
});

// Búsqueda avanzada de clientes
app.get("/clients/search", async (req, res) => {
  const { query } = req.query;

  if (!query || query.length < 2) {
    return res.json([]);
  }

  try {
    const [clients] = await connection.promise().query(
      `SELECT 
        id, 
        name, 
        document_type, 
        document_number 
      FROM clients 
      WHERE 
        LOWER(name) LIKE LOWER(?) OR 
        document_number LIKE ? OR 
        document_type LIKE ?
      LIMIT 10`,
      [`%${query}%`, `%${query}%`, `%${query}%`]
    );

    console.log(
      `Búsqueda de clientes - Query: "${query}" - Resultados: ${clients.length}`
    );
    res.json(clients);
  } catch (error) {
    console.error("Error en búsqueda de clientes:", error);
    res.status(500).json({ error: "Error en la búsqueda" });
  }
});

// Búsqueda avanzada de proveedores
app.get("/providers/search", async (req, res) => {
  const { query } = req.query;

  if (!query || query.length < 2) {
    return res.json([]);
  }

  try {
    const [providers] = await connection.promise().query(
      `SELECT 
        id, 
        name, 
        document_type, 
        document_number 
      FROM providers 
      WHERE 
        LOWER(name) LIKE LOWER(?) OR 
        document_number LIKE ? OR 
        document_type LIKE ?
      LIMIT 10`,
      [`%${query}%`, `%${query}%`, `%${query}%`]
    );

    console.log(
      `Búsqueda de proveedores - Query: "${query}" - Resultados: ${providers.length}`
    );
    res.json(providers);
  } catch (error) {
    console.error("Error en búsqueda de proveedores:", error);
    res.status(500).json({ error: "Error en la búsqueda" });
  }
});

// Obtener siguiente consecutivo
app.get("/next-consecutive", async (req, res) => {
  try {
    const consecutive = await getNextConsecutive();
    res.json({ consecutive });
  } catch (error) {
    console.error("Error al obtener consecutivo:", error);
    res.status(500).json({ error: "Error al obtener consecutivo" });
  }
});

// Endpoints de Proveedores
app.get("/providers", async (req, res) => {
  try {
    const [providers] = await connection
      .promise()
      .query("SELECT * FROM providers");
    res.json(providers);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener proveedores" });
  }
});

app.post("/providers", async (req, res) => {
  const { name, document_type, document_number } = req.body;
  try {
    const [result] = await connection
      .promise()
      .query(
        "INSERT INTO providers (name, document_type, document_number) VALUES (?, ?, ?)",
        [name, document_type, document_number]
      );
    const [newProvider] = await connection
      .promise()
      .query("SELECT * FROM providers WHERE id = ?", [result.insertId]);
    res.json(newProvider[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al crear proveedor" });
  }
});

app.post("/orders", upload.array("files"), async (req, res) => {
  let connection;
  try {
    connection = await mysql
      .createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      })
      .promise();

    await connection.beginTransaction();

    const orderData = JSON.parse(req.body.orderData);
    console.log("Datos completos de la orden:", orderData);
    console.log("Artículos a insertar:", orderData.articles);

    const [lastConsecutive] = await connection.query(
      "SELECT MAX(order_consecutive) as max_consecutive FROM orders"
    );
    const nextConsecutive = (
      parseInt(lastConsecutive[0].max_consecutive || "0000") + 1
    )
      .toString()
      .padStart(4, "0");

    console.log("Consecutivo generado:", nextConsecutive);

    const orderToInsert = {
      document_type: String(orderData.document_type).trim(),
      order_consecutive: nextConsecutive,
      order_number: `${orderData.document_type.trim()}-${nextConsecutive}`,
      client_id: Number(orderData.client_id),
      provider_id: Number(orderData.articles[0].providerId),
      details: String(orderData.articles[0].description).trim(),
      unit_price: Number(orderData.articles[0].unitPrice),
      quantity: Number(orderData.articles[0].quantity),
      subtotal: Number(
        orderData.articles.reduce((sum, art) => sum + Number(art.subtotal), 0)
      ),
      iva: Number(
        orderData.articles.reduce((sum, art) => sum + Number(art.iva), 0)
      ),
      total: Number(
        orderData.articles.reduce((sum, art) => sum + Number(art.total), 0)
      ),
      provider_invoice: String(orderData.provider_invoice).trim(),
      due_date: orderData.due_date,
      status: String(orderData.status).trim(),
    };

    console.log("Datos de orden a insertar:", orderToInsert);

    const [result] = await connection.query("INSERT INTO orders SET ?", [
      orderToInsert,
    ]);

    const orderId = result.insertId;
    console.log("Orden insertada con ID:", orderId);

    // Insertar cada artículo en order_items
    console.log("Insertando artículos en order_items...");
    for (const article of orderData.articles) {
      const itemToInsert = {
        order_id: orderId,
        provider_id: article.providerId,
        details: article.description,
        quantity: article.quantity,
        unit_price: article.unitPrice,
        subtotal: article.subtotal,
        iva: article.iva,
        total: article.total,
        provider_invoice: orderData.provider_invoice,
      };
      console.log("Insertando artículo:", itemToInsert);

      await connection.query("INSERT INTO order_items SET ?", [itemToInsert]);
    }

    // Procesar archivos si existen
    if (req.files && req.files.length > 0) {
      console.log("Procesando archivos adjuntos:", req.files.length);
      for (const file of req.files) {
        console.log("Insertando archivo:", file.filename);
        await connection.query(
          "INSERT INTO order_files (order_id, file_name, file_path, file_type, mime_type) VALUES (?, ?, ?, ?, ?)",
          [
            orderId,
            file.filename,
            file.path,
            path.extname(file.originalname),
            file.mimetype,
          ]
        );
      }
    }

    await connection.commit();
    console.log("Transacción completada exitosamente");

    res.json({
      success: true,
      orderId: orderId,
      consecutive: nextConsecutive,
      message: "Orden creada exitosamente",
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Error detallado al crear orden:", error);
    res.status(500).json({
      error: error.message || "Error al crear orden",
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

// Endpoint para obtener archivos de una orden
app.get("/orders/:id/files", async (req, res) => {
  try {
    const [files] = await connection
      .promise()
      .query("SELECT * FROM order_files WHERE order_id = ?", [req.params.id]);
    console.log("Archivos encontrados:", files);
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener archivos" });
  }
});

app.put("/orders/:id", upload.array("files"), async (req, res) => {
  let connection = null;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    }).promise();

    const orderId = req.params.id;
    const orderData = JSON.parse(req.body.orderData);

    console.log('Datos recibidos en server:', orderData);
    console.log('Archivos recibidos:', req.files);

    await connection.beginTransaction();

    // 1. Actualizar orden principal
    const updateOrderQuery = `
      UPDATE orders 
      SET document_type = ?,
          client_id = ?,
          provider_id = ?,
          details = ?,
          subtotal = ?,
          iva = ?,
          total = ?,
          provider_invoice = ?,
          due_date = ?,
          status = ?
      WHERE id = ?`;

    const updateOrderParams = [
      orderData.document_type,
      orderData.client_id,
      orderData.provider_id,
      orderData.details,
      orderData.subtotal,
      orderData.iva,
      orderData.total,
      orderData.provider_invoice,
      orderData.due_date,
      orderData.status,
      orderId
    ];

    await connection.query(updateOrderQuery, updateOrderParams);

    // 2. Eliminar y reinsertar items
    await connection.query('DELETE FROM order_items WHERE order_id = ?', [orderId]);

    for (const article of orderData.articles) {
      const insertItemQuery = `
        INSERT INTO order_items 
        (order_id, provider_id, details, quantity, unit_price, subtotal, iva, total, provider_invoice)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const insertItemParams = [
        orderId,
        article.providerId,
        article.description,
        article.quantity,
        article.unitPrice,
        article.subtotal,
        article.iva,
        article.total,
        orderData.provider_invoice
      ];

      await connection.query(insertItemQuery, insertItemParams);
    }

    // 3. Procesar nuevos archivos
    if (req.files && req.files.length > 0) {
      console.log('Procesando archivos nuevos:', req.files.length);
      for (const file of req.files) {
        await connection.query(
          "INSERT INTO order_files (order_id, file_name, file_path, file_type, mime_type) VALUES (?, ?, ?, ?, ?)",
          [
            orderId,
            file.filename,
            file.path,
            path.extname(file.originalname),
            file.mimetype,
          ]
        );
      }
    }

    await connection.commit();
    res.json({
      success: true,
      message: 'Orden actualizada exitosamente',
      orderId: orderId
    });

  } catch (error) {
    console.error('Error en actualización:', error);
    if (connection) {
      await connection.rollback();
    }
    res.status(500).json({
      error: 'Error al actualizar la orden',
      details: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

// Endpoint para eliminar archivo
app.delete("/files/:id", async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    }).promise();

    // 1. Obtener información del archivo
    const [files] = await connection.query(
      "SELECT * FROM order_files WHERE id = ?",
      [req.params.id]
    );

    if (!files.length) {
      return res.status(404).json({ error: "Archivo no encontrado" });
    }

    const file = files[0];

    // 2. Eliminar el archivo físico
    const filePath = path.join(__dirname, file.file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // 3. Eliminar el registro de la base de datos
    await connection.query("DELETE FROM order_files WHERE id = ?", [req.params.id]);

    res.json({ success: true, message: "Archivo eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar archivo:", error);
    res.status(500).json({ error: "Error al eliminar el archivo" });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

// 11. Iniciar servidor
app.listen(3001, () => {
  console.log("Servidor corriendo en puerto 3001");
});
