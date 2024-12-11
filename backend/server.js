// 1. Importaciones - Reorganizadas y ordenadas
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Movido al inicio con las demás importaciones
require('dotenv').config();

// 2. Configuración inicial
const app = express();
const uploadDir = './uploads';

// Crear directorio de uploads si no existe
if (!fs.existsSync(uploadDir)){
  fs.mkdirSync(uploadDir);
}

// 3. Middleware básico
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 4. Configuración CORS
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  exposedHeaders: ['Content-Disposition'], // Importante para descargas
  preflightContinue: false
}));

// 5. Middleware de logging
app.use((req, res, next) => {
  console.log('Request URL:', req.url);
  console.log('__dirname:', __dirname);
  next();
});

// 6. Configuración de base de datos
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// 7. Configuración de Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const cleanFileName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, `${Date.now()}_${cleanFileName}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos PDF'), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

// 8. Funciones auxiliares
const getNextConsecutive = async () => {
  const [result] = await connection.promise().query(
    'SELECT MAX(order_consecutive) as max_consecutive FROM orders'
  );
  const maxConsecutive = result[0].max_consecutive || '0000';
  const nextNumber = parseInt(maxConsecutive, 10) + 1;
  return nextNumber.toString().padStart(4, '0');
};

// 9. Endpoints de diagnóstico y archivos
app.get('/debug-files', async (req, res) => {
  try {
    const [files] = await connection.promise().query('SELECT * FROM order_files');
    const uploadsDir = path.join(__dirname, 'uploads');
    const physicalFiles = fs.readdirSync(uploadsDir);
    
    res.json({
      databaseFiles: files,
      physicalFiles,
      serverInfo: {
        uploadsPath: uploadsDir,
        exists: fs.existsSync(uploadsDir),
        isDirectory: fs.statSync(uploadsDir).isDirectory()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint mejorado para servir archivos
app.get('/files/:id', async (req, res) => {
  console.log('Accediendo a archivo con ID:', req.params.id);
  
  try {
    const [files] = await connection.promise().query(
      'SELECT * FROM order_files WHERE id = ?',
      [req.params.id]
    );
    
    if (!files || files.length === 0) {
      console.log('No se encontró el archivo en la base de datos');
      return res.status(404).send('Archivo no encontrado en la base de datos');
    }
    
    const file = files[0];
    console.log('Archivo encontrado en BD:', file);
    
    let filePath = path.join(__dirname, file.file_path);
    console.log('Intentando acceder al archivo en:', filePath);
    
    if (!fs.existsSync(filePath)) {
      // Intenta buscar en la carpeta uploads directamente
      filePath = path.join(__dirname, 'uploads', file.file_name);
      console.log('Intentando ruta alternativa:', filePath);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).send('Archivo no encontrado');
      }
    }

    res.contentType('application/pdf');
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('Error completo:', error);
    res.status(500).send('Error interno del servidor');
  }
});

// 10. Endpoints principales
// Login endpoint
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  connection.query(
    'SELECT * FROM users WHERE email = ? AND password = ?',
    [email, password],
    (error, results) => {
      if (error) return res.status(500).json({ error: 'Error servidor' });
      if (results.length > 0) {
        res.json({ user: results[0] });
      } else {
        res.status(401).json({ error: 'Credenciales inválidas' });
      }
    }
  );
});

// Endpoints de Clientes
app.get('/clients', async (req, res) => {
  try {
    const [clients] = await connection.promise().query('SELECT * FROM clients');
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

app.post('/clients', async (req, res) => {
  const { name, document_type, document_number } = req.body;
  try {
    const [result] = await connection.promise().query(
      'INSERT INTO clients (name, document_type, document_number) VALUES (?, ?, ?)',
      [name, document_type, document_number]
    );
    const [newClient] = await connection.promise().query(
      'SELECT * FROM clients WHERE id = ?',
      [result.insertId]
    );
    res.json(newClient[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

// Búsqueda avanzada de clientes
app.get('/clients/search', async (req, res) => {
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
    
    console.log(`Búsqueda de clientes - Query: "${query}" - Resultados: ${clients.length}`);
    res.json(clients);
  } catch (error) {
    console.error('Error en búsqueda de clientes:', error);
    res.status(500).json({ error: 'Error en la búsqueda' });
  }
});

// Búsqueda avanzada de proveedores
app.get('/providers/search', async (req, res) => {
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
    
    console.log(`Búsqueda de proveedores - Query: "${query}" - Resultados: ${providers.length}`);
    res.json(providers);
  } catch (error) {
    console.error('Error en búsqueda de proveedores:', error);
    res.status(500).json({ error: 'Error en la búsqueda' });
  }
});

// Obtener siguiente consecutivo
app.get('/next-consecutive', async (req, res) => {
  try {
    const consecutive = await getNextConsecutive();
    res.json({ consecutive });
  } catch (error) {
    console.error('Error al obtener consecutivo:', error);
    res.status(500).json({ error: 'Error al obtener consecutivo' });
  }
});

// Endpoints de Proveedores
app.get('/providers', async (req, res) => {
  try {
    const [providers] = await connection.promise().query('SELECT * FROM providers');
    res.json(providers);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener proveedores' });
  }
});

app.post('/providers', async (req, res) => {
  const { name, document_type, document_number } = req.body;
  try {
    const [result] = await connection.promise().query(
      'INSERT INTO providers (name, document_type, document_number) VALUES (?, ?, ?)',
      [name, document_type, document_number]
    );
    const [newProvider] = await connection.promise().query(
      'SELECT * FROM providers WHERE id = ?',
      [result.insertId]
    );
    res.json(newProvider[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear proveedor' });
  }
});

// En server.js, modificar el endpoint GET /orders
app.get('/orders', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    console.log('Backend - Recibido request con fechas:', { startDate, endDate });
    
    let query = `
      SELECT 
        o.*,
        c.name as client_name,
        GROUP_CONCAT(oi.details SEPARATOR ', ') as details_list
      FROM orders o
      LEFT JOIN clients c ON o.client_id = c.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
    `;
    
    const queryParams = [];
    
    if (startDate && endDate) {
      // Cambiamos el WHERE para buscar en un rango de fechas
      query += ` WHERE DATE(o.created_at) BETWEEN DATE(?) AND DATE(?)`;
      queryParams.push(startDate, endDate);
      
      console.log('Backend - Query SQL:', query);
      console.log('Backend - Parámetros:', queryParams);
    }
    
    query += ` GROUP BY o.id ORDER BY o.created_at DESC`;
    
    console.log('Backend - Query final:', query);
    
    const [orders] = await connection.promise().query(query, queryParams);
    console.log('Backend - Órdenes encontradas:', orders.length);
    
    const formattedOrders = orders.map(order => ({
      ...order,
      items: [{
        id: order.id,
        details: order.details_list || order.details,
        quantity: order.quantity,
        unit_price: order.unit_price,
        subtotal: order.subtotal,
        iva: order.iva,
        total: order.total,
        provider_name: order.provider_name,
        provider_invoice: order.provider_invoice
      }]
    }));

    console.log('Backend - Enviando respuesta con', formattedOrders.length, 'órdenes');
    res.json(formattedOrders);
  } catch (error) {
    console.error('Backend - Error SQL:', error);
    res.status(500).json({ error: 'Error al obtener órdenes' });
  }
});
// Endpoints de Órdenes
// app.get('/orders', async (req, res) => {
//   try {
//     const [orders] = await connection.promise().query(`
//       SELECT o.*, 
//              c.name as client_name, 
//              p.name as provider_name 
//       FROM orders o 
//       LEFT JOIN clients c ON o.client_id = c.id 
//       LEFT JOIN providers p ON o.provider_id = p.id
//     `);
//     res.json(orders);
//   } catch (error) {
//     res.status(500).json({ error: 'Error al obtener órdenes' });
//   }
// });


app.post('/orders', upload.array('files'), async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    }).promise();
 
    await connection.beginTransaction();
    
    const orderData = JSON.parse(req.body.orderData);
    console.log('Datos completos de la orden:', orderData);
    console.log('Artículos a insertar:', orderData.articles);
    
    const [lastConsecutive] = await connection.query(
      'SELECT MAX(order_consecutive) as max_consecutive FROM orders'
    );
    const nextConsecutive = (parseInt(lastConsecutive[0].max_consecutive || '0000') + 1)
      .toString().padStart(4, '0');
    
    console.log('Consecutivo generado:', nextConsecutive);
 
    const orderToInsert = {
      document_type: String(orderData.document_type).trim(),
      order_consecutive: nextConsecutive,
      order_number: `${orderData.document_type.trim()}-${nextConsecutive}`,
      client_id: Number(orderData.client_id),
      provider_id: Number(orderData.articles[0].providerId),
      details: String(orderData.articles[0].description).trim(),
      unit_price: Number(orderData.articles[0].unitPrice),
      quantity: Number(orderData.articles[0].quantity),
      subtotal: Number(orderData.articles.reduce((sum, art) => sum + Number(art.subtotal), 0)),
      iva: Number(orderData.articles.reduce((sum, art) => sum + Number(art.iva), 0)),
      total: Number(orderData.articles.reduce((sum, art) => sum + Number(art.total), 0)),
      provider_invoice: String(orderData.provider_invoice).trim(),
      due_date: orderData.due_date,
      status: String(orderData.status).trim()
    };
 
    console.log('Datos de orden a insertar:', orderToInsert);
 
    const [result] = await connection.query(
      'INSERT INTO orders SET ?',
      [orderToInsert]
    );
 
    const orderId = result.insertId;
    console.log('Orden insertada con ID:', orderId);
 
    // Insertar cada artículo en order_items
    console.log('Insertando artículos en order_items...');
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
        provider_invoice: orderData.provider_invoice
      };
      console.log('Insertando artículo:', itemToInsert);
      
      await connection.query(
        'INSERT INTO order_items SET ?',
        [itemToInsert]
      );
    }
 
    // Procesar archivos si existen
    if (req.files && req.files.length > 0) {
      console.log('Procesando archivos adjuntos:', req.files.length);
      for (const file of req.files) {
        console.log('Insertando archivo:', file.filename);
        await connection.query(
          'INSERT INTO order_files (order_id, file_name, file_path, file_type, mime_type) VALUES (?, ?, ?, ?, ?)',
          [
            orderId,
            file.filename,
            file.path,
            path.extname(file.originalname),
            file.mimetype
          ]
        );
      }
    }
 
    await connection.commit();
    console.log('Transacción completada exitosamente');
 
    res.json({ 
      success: true,
      orderId: orderId,
      consecutive: nextConsecutive,
      message: 'Orden creada exitosamente'
    });
 
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error detallado al crear orden:', error);
    res.status(500).json({
      error: error.message || 'Error al crear orden'
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
 });

// En server.js, modificar el endpoint GET /orders/:id
// app.get('/orders/:id', async (req, res) => {
//   console.log('Consultando orden ID:', req.params.id);
  
//   try {
//     const [orders] = await connection.promise().query(`
//       SELECT 
//         o.*,
//         c.name as client_name,
//         p.name as provider_name
//       FROM orders o
//       LEFT JOIN clients c ON o.client_id = c.id
//       LEFT JOIN providers p ON o.provider_id = p.id
//       WHERE o.id = ?
//     `, [req.params.id]);

//     console.log('Orden encontrada:', orders[0]);

//     if (!orders.length) {
//       console.log('No se encontró la orden');
//       return res.status(404).json({ error: 'Orden no encontrada' });
//     }

//     // Obtener todos los artículos de la orden
//     const [items] = await connection.promise().query(`
//       SELECT 
//         oi.*,
//         p.name as provider_name
//       FROM order_items oi
//       LEFT JOIN providers p ON oi.provider_id = p.id
//       WHERE oi.order_id = ?
//     `, [req.params.id]);

//     console.log('Items encontrados:', items);

//     // Estructurar la respuesta
//     const order = orders[0];
//     const formattedOrder = {
//       ...order,
//       items: items.map(item => ({
//         id: item.id,
//         details: item.details,
//         quantity: item.quantity,
//         unit_price: item.unit_price,
//         subtotal: item.subtotal,
//         iva: item.iva,
//         total: item.total,
//         provider_name: item.provider_name,
//         provider_invoice: item.provider_invoice
//       }))
//     };

//     console.log('Orden formateada:', formattedOrder);
//     res.json(formattedOrder);
//   } catch (error) {
//     console.error('Error completo:', error);
//     res.status(500).json({ error: 'Error al obtener detalles de la orden' });
//   }
// });

app.get('/orders/:id', async (req, res) => {
  console.log('Consultando orden ID:', req.params.id);
  
  try {
    const [orders] = await connection.promise().query(`
      SELECT 
        o.*,
        c.name as client_name,
        c.document_type as client_document_type,
        c.document_number as client_document_number,
        p.name as provider_name
      FROM orders o
      LEFT JOIN clients c ON o.client_id = c.id
      LEFT JOIN providers p ON o.provider_id = p.id
      WHERE o.id = ?
    `, [req.params.id]);

    if (!orders.length) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    // Obtener todos los artículos de la orden
    const [items] = await connection.promise().query(`
      SELECT 
        oi.*,
        p.name as provider_name
      FROM order_items oi
      LEFT JOIN providers p ON oi.provider_id = p.id
      WHERE oi.order_id = ?
    `, [req.params.id]);

    // Estructurar la respuesta incluyendo los datos del cliente
    const formattedOrder = {
      ...orders[0],
      client_info: {
        name: orders[0].client_name,
        document_type: orders[0].client_document_type,
        document_number: orders[0].client_document_number
      },
      items: items.map(item => ({
        id: item.id,
        details: item.details,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        iva: item.iva,
        total: item.total,
        provider_name: item.provider_name,
        provider_invoice: item.provider_invoice
      }))
    };

    console.log('Orden formateada:', formattedOrder);
    res.json(formattedOrder);
  } catch (error) {
    console.error('Error completo:', error);
    res.status(500).json({ error: 'Error al obtener detalles de la orden' });
  }
});
app.get('/orders/:id/files', async (req, res) => {
  try {
    const [files] = await connection.promise().query(
      'SELECT * FROM order_files WHERE order_id = ?',
      [req.params.id]
    );
    console.log('Archivos encontrados:', files);
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener archivos' });
  }
});

app.put('/orders/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  try {
    // Verificar que la orden existe
    const [order] = await connection.promise().query(
      'SELECT id FROM orders WHERE id = ?',
      [id]
    );
    
    if (order.length === 0) {
      return res.status(404).json({
        error: 'Orden no encontrada'
      });
    }

    // Validar el estado
    const validStates = ['pendiente_facturar', 'facturado', 'seguimiento'];
    if (!validStates.includes(status)) {
      return res.status(400).json({
        error: 'Estado no válido'
      });
    }

    // Actualizar el estado
    await connection.promise().query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, id]
    );

    res.json({
      message: 'Estado actualizado correctamente',
      orderId: id,
      newStatus: status
    });

  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({
      error: 'Error al actualizar el estado de la orden',
      details: error.message
    });
  }
});

// 11. Iniciar servidor
app.listen(3001, () => {
  console.log('Servidor corriendo en puerto 3001');
});