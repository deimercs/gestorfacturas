const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();


const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)){
  fs.mkdirSync(uploadDir);
}

const app = express();

app.use(express.json());
// Configuración para archivos estáticos y uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuración CORS unificada
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:5173'], 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false
}));

app.use((req, res, next) => {
  console.log('Request URL:', req.url);
  console.log('__dirname:', __dirname);
  next();
});

// Configuración de base de datos
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

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

app.get('/files/:id', async (req, res) => {
  console.log('Accediendo a archivo con ID:', req.params.id);
  
  try {
    // 1. Primero verificamos si obtenemos el archivo de la base de datos
    const [files] = await connection.promise().query(
      'SELECT * FROM order_files WHERE id = ?',
      [req.params.id]
    );
    
    console.log('Resultado de la consulta:', files);
    
    if (!files || files.length === 0) {
      console.log('No se encontró el archivo en la base de datos');
      return res.status(404).send('Archivo no encontrado en la base de datos');
    }
    
    const file = files[0];
    console.log('Archivo encontrado en BD:', file);
    
    // 2. Construimos y verificamos la ruta del archivo
    let filePath = file.file_path;
    if (!path.isAbsolute(filePath)) {
      filePath = path.join(__dirname, 'uploads', file.file_name);
    }
    
    console.log('Ruta del archivo:', filePath);
    console.log('__dirname:', __dirname);
    console.log('Existe el archivo?:', fs.existsSync(filePath));
    
    if (!fs.existsSync(filePath)) {
      // Intentar buscar solo por nombre de archivo
      const alternativePath = path.join(__dirname, 'uploads', path.basename(file.file_name));
      console.log('Intentando ruta alternativa:', alternativePath);
      console.log('Existe en ruta alternativa?:', fs.existsSync(alternativePath));
      
      if (fs.existsSync(alternativePath)) {
        filePath = alternativePath;
      } else {
        console.log('Archivo no encontrado en el sistema de archivos');
        return res.status(404).send('Archivo físico no encontrado');
      }
    }
    
    // 3. Intentamos servir el archivo
    console.log('Intentando servir archivo desde:', filePath);
    res.contentType('application/pdf');
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('Error completo:', error);
    res.status(500).send('Error interno del servidor');
  }
});


const fs = require('fs');

app.get('/download/:filename', (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename);
    const filePath = path.join(__dirname, 'uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      console.log('Archivo no encontrado:', filePath);
      return res.status(404).send('Archivo no encontrado');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('Error al descargar el archivo:', error);
    res.status(500).send('Error al descargar el archivo');
  }
});

// Configuración de multer para archivos PDF
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    // Limpia el nombre del archivo
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
    fileSize: 5 * 1024 * 1024 // 5MB límite
  }
});

const getNextConsecutive = async () => {
  const [result] = await connection.promise().query(
    'SELECT MAX(order_consecutive) as max_consecutive FROM orders'
  );
  const maxConsecutive = result[0].max_consecutive || '0000';
  const nextNumber = parseInt(maxConsecutive, 10) + 1;
  return nextNumber.toString().padStart(4, '0');
};

// Endpoint de login
app.post('/login', (req, res) => {
  console.log('Recibiendo login:', req.body);
  const { email, password } = req.body;
  
  connection.query(
    'SELECT * FROM users WHERE email = ? AND password = ?',
    [email, password],
    (error, results) => {
      if (error) {
        console.error('Error DB:', error);
        return res.status(500).json({ error: 'Error servidor' });
      }
      
      if (results.length > 0) {
        res.json({ user: results[0] });
      } else {
        res.status(401).json({ error: 'Credenciales inválidas' });
      }
    }
  );
});

// Endpoints para Clientes
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
    console.error('Error al crear cliente:', error);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

// Endpoints para Proveedores
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
    console.error('Error al crear proveedor:', error);
    res.status(500).json({ error: 'Error al crear proveedor' });
  }
});


// Endpoints para Órdenes
app.post('/orders', upload.array('files'), async (req, res) => {
  try {
    // Verificar si el número ya existe
    const [existing] = await connection.promise().query(
      'SELECT id FROM orders WHERE order_number = ?',
      [req.body.order_number]
    );

    if (existing.length > 0) {
      return res.status(400).json({ 
        error: 'El número de documento ya existe' 
      });
    }

    // Obtener siguiente consecutivo
    const order_consecutive = await getNextConsecutive();

    // Preparar datos de la orden
    const orderData = {
      order_consecutive,
      document_type: req.body.document_type,
      order_number: req.body.order_number,
      client_id: req.body.clientId,
      provider_id: req.body.providerId,
      details: req.body.details,
      unit_price: req.body.unitPrice,
      quantity: req.body.quantity,
      subtotal: req.body.subtotal,
      iva: req.body.iva,
      total: req.body.total,
      provider_invoice: req.body.providerInvoice,
      due_date: req.body.dueDate,
      status: req.body.status
    };

    // Insertar la orden
    const [orderResult] = await connection.promise().query(
      'INSERT INTO orders SET ?',
      orderData
    );

    // Manejar archivos
    if (req.files?.length) {
      const fileValues = req.files.map(file => [
        orderResult.insertId,
        file.originalname,
        file.path,
        'pdf',
        file.mimetype
      ]);

      await connection.promise().query(
        'INSERT INTO order_files (order_id, file_name, file_path, file_type, mime_type) VALUES ?',
        [fileValues]
      );
    }

    res.json({ 
      message: 'Orden creada exitosamente',
      orderId: orderResult.insertId,
      consecutive: order_consecutive
    });

  } catch (error) {
    console.error('Error al crear orden:', error);
    res.status(500).json({ 
      error: 'Error al crear orden',
      details: error.message 
    });
  }
});

// Obtener archivos de una orden
app.get('/orders/:id/files', async (req, res) => {
  const { id } = req.params;

  try {
    const [files] = await connection.promise().query(
      'SELECT * FROM order_files WHERE order_id = ?',
      [id]
    );
    console.log('Archivos encontrados:', files);
    res.json(files);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener archivos' });
  }
});

app.get('/orders', async (req, res) => {
  try {
    const [orders] = await connection.promise().query(`
      SELECT o.*, 
             c.name as client_name, 
             p.name as provider_name 
      FROM orders o 
      LEFT JOIN clients c ON o.client_id = c.id 
      LEFT JOIN providers p ON o.provider_id = p.id
    `);
    console.log('Órdenes encontradas:', orders);
    res.json(orders);
  } catch (error) {
    console.error('Error SQL:', error);
    res.status(500).json({ error: 'Error al obtener órdenes' });
  }
});

// Endpoint para ver PDF en línea
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Endpoint para ver PDF - Agrégalo después de las otras rutas
app.get('/view-pdf/:filename', (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename);
    const filePath = path.join(__dirname, 'uploads', filename);
    
    // Verifica si el archivo existe
    if (!fs.existsSync(filePath)) {
      console.log('Archivo no encontrado:', filePath);
      return res.status(404).send('Archivo no encontrado');
    }

    // Envía el archivo
    res.setHeader('Content-Type', 'application/pdf');
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('Error al servir el PDF:', error);
    res.status(500).send('Error al procesar el archivo');
  }
});

app.listen(3001, () => {
  console.log('Servidor corriendo en puerto 3001');
});
