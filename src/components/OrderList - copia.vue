
<template>

  <div class="min-h-screen bg-gray-100 py-8 px-4">
    <!-- Alert -->
   <div v-if="alert" :class="`fixed top-4 right-4 p-4 rounded-md ${alert.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`">
      {{ alert.message }}
    </div>


    <div class="max-w-7xl mx-auto">
      <!-- Header con botón para crear nueva orden -->
      <div class="flex justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Listado de Órdenes</h1>
        <router-link to="/orders/create" class="bg-[#2d1e2f] text-white px-4 py-2 rounded hover:bg-[#3d2e3f]">
          Nueva Orden
        </router-link>
      </div>

      <!-- Tabla de órdenes -->
      <div class="bg-white shadow-lg rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th v-for="header in tableHeaders" :key="header" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {{ header }}
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="order in orders" :key="order.id">
                <td class="px-6 py-4 whitespace-nowrap">{{ order.documentNumber }}</td>
                <td class="px-6 py-4 whitespace-nowrap">{{ order.client_name }}</td>
                <td class="px-6 py-4">{{ order.details }}</td>
                <td class="px-6 py-4 whitespace-nowrap">{{ formatCurrency(order.unitPrice) }}</td>
                <td class="px-6 py-4 whitespace-nowrap">{{ order.quantity }}</td>
                <td class="px-6 py-4 whitespace-nowrap">{{ formatCurrency(order.subtotal) }}</td>
                <td class="px-6 py-4 whitespace-nowrap">{{ formatCurrency(order.iva) }}</td>
                <td class="px-6 py-4 whitespace-nowrap">{{ formatCurrency(order.total) }}</td>
                <td class="px-6 py-4 whitespace-nowrap">{{ order.provider_name }}</td>
                <td class="px-6 py-4 whitespace-nowrap">{{ order.providerInvoice }}</td>
                <td class="px-6 py-4 whitespace-nowrap">{{ formatDate(order.dueDate) }}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <select 
                    v-model="order.status"
                    @change="updateStatus(order)"
                    :class="`rounded-full px-3 py-1 text-sm font-semibold ${getStatusColor(order.status)}`"
                  >
                    <option value="pendiente_facturar">Pendiente por Facturar</option>
                    <option value="facturado">Facturado</option>
                    <option value="seguimiento">En Seguimiento</option>
                  </select>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <button @click="showFiles(order)" class="text-blue-600 hover:text-blue-900">
                    Ver archivos
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>   
    
    <!-- Modal para archivos -->
  <div v-if="showFilesModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-bold">Archivos adjuntos</h3>
        <button 
          @click="closeFilesModal" 
          class="text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>

      <!-- Modal de detalle de orden -->
      <div v-if="showDetailModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <!-- contenido del modal -->
      </div>
      
      <!-- Loading state -->
      <div v-if="loading" class="text-center py-4">
        Cargando archivos...
      </div>
      
      <!-- Error state -->
      <div v-else-if="error" class="text-red-600 text-center py-4">
        {{ error }}
      </div>
      
      <!-- Files list -->
      <div v-else-if="selectedOrderFiles.length" class="space-y-4">
        <div v-for="file in selectedOrderFiles" :key="file.id" class="border rounded p-4">
          <div class="flex justify-between items-center mb-2">
            <span class="font-medium">{{ file.file_name }}</span>
            <div class="space-x-2">
              <button 
                @click="file.showPreview = !file.showPreview"
                class="text-blue-600 hover:text-blue-800 px-3 py-1 rounded-md border border-blue-600"
              >
                {{ file.showPreview ? 'Ocultar' : 'Ver' }}
              </button>
              <a 
                :href="`http://localhost:3001/files/${file.id}`"
                class="text-[#f15025] hover:text-[#d13815] px-3 py-1 rounded-md border border-[#f15025]"
                target="_blank"
              >
                Descargar
              </a>
            </div>
          </div>
          
          <!-- Vista previa del PDF -->
          <div v-if="file.showPreview" class="mt-2">
            <object
              :data="`http://localhost:3001/files/${file.id}`"
              type="application/pdf"
              class="w-full h-[500px] border rounded"
            >
              <p>Tu navegador no puede mostrar el PDF. 
                <a :href="`http://localhost:3001/files/${file.id}`">Click aquí para descargar</a>
              </p>
            </object>
          </div>
        </div>
      </div>
      
      <!-- No files state -->
      <div v-else class="text-center py-4 text-gray-500">
        No hay archivos adjuntos para esta orden
      </div>
    </div>
  </div>
  </div>
  
</template>

<script>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { Eye, Files, Pencil } from 'lucide-vue';

export default {
  name: 'OrderList',
  setup() {
    // Estados para manejo de órdenes y UI
    const orders = ref([]);
    const showFilesModal = ref(false);
    const selectedOrderFiles = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const alert = ref(null);

    // Lista de encabezados para la tabla
    const tableHeaders = [
      'Número Doc', 'Cliente', 'Detalles', 'Precio Unit.', 
      'Cantidad', 'Subtotal', 'IVA', 'Total', 'Proveedor',
      'FC Proveedor', 'Vencimiento', 'Estado'
    ];

    // Cargar todas las órdenes
    const fetchOrders = async () => {
      try {
        const response = await axios.get('http://localhost:3001/orders');
        orders.value = response.data;
      } catch (error) {
        console.error('Error detallado:', error);
        showAlert('Error al cargar órdenes');
      }
    };

    const showDetailModal = ref(false);
    const selectedOrder = ref(null);

    // Añade esta función
    const showOrderDetail = (order) => {
      selectedOrder.value = order;
      showDetailModal.value = true;
    };

    // Mostrar archivos de una orden
    const showFiles = async (order) => {
      loading.value = true;
      error.value = null;
      showFilesModal.value = true;
      
      try {
        const response = await axios.get(`http://localhost:3001/orders/${order.id}/files`);
        selectedOrderFiles.value = response.data.map(file => ({
          ...file,
          showPreview: false
        }));
      } catch (err) {
        error.value = 'Error al cargar los archivos';
        console.error('Error:', err);
      } finally {
        loading.value = false;
      }
    };

    // Cerrar el modal de archivos
    const closeFilesModal = () => {
      showFilesModal.value = false;
      selectedOrderFiles.value = [];
      error.value = null;
    };

    // Alternar vista previa de archivo
    const viewFile = (file) => {
      file.showPreview = !file.showPreview;
    };

    // Descargar un archivo
  //   const downloadFile = async (file) => {
  // try {
  //   // Extraer solo el nombre del archivo de la ruta completa
  //   const fileName = file.file_name.split('/').pop();
    
  //     const response = await axios({
  //       url: `http://localhost:3001/download/${encodeURIComponent(fileName)}`,
  //       method: 'GET',
  //       responseType: 'blob'
  //     });
    
  //     // Crear el blob y descargar
  //     const blob = new Blob([response.data], { type: 'application/pdf' });
  //     const url = window.URL.createObjectURL(blob);
  //     const link = document.createElement('a');
  //     link.href = url;
  //     link.setAttribute('download', fileName);
  //     document.body.appendChild(link);
  //     link.click();
  //     document.body.removeChild(link);
  //     window.URL.revokeObjectURL(url);
  //   } catch (error) {
  //     console.error('Error al descargar:', error);
  //     if (error.response?.status === 404) {
  //       showAlert('Archivo no encontrado');
  //     } else {
  //       showAlert('Error al descargar el archivo');
  //     }
  //   }
  // };

    // Actualizar estado de una orden
    const updateStatus = async (order) => {
      try {
        await axios.put(`http://localhost:3001/orders/${order.id}/status`, {
          status: order.status
        });
        showAlert('Estado actualizado correctamente', 'success');
      } catch (error) {
        showAlert('Error al actualizar estado');
        await fetchOrders();
      }
    };

    // Formatear fecha
    const formatDate = (date) => {
      return date ? new Date(date).toLocaleDateString() : '';
    };

    // Formatear moneda
    const formatCurrency = (value) => {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP'
      }).format(value);
    };

    // Obtener color según estado
    const getStatusColor = (status) => {
      const colors = {
        pendiente_facturar: 'bg-yellow-100 text-yellow-800',
        facturado: 'bg-green-100 text-green-800',
        seguimiento: 'bg-blue-100 text-blue-800'
      };
      return colors[status] || 'bg-gray-100';
    };

    // Mostrar alertas
    const showAlert = (message, type = 'error') => {
      alert.value = { message, type };
      setTimeout(() => {
        alert.value = null;
      }, 3000);
    };

    // Cargar datos al montar el componente
    onMounted(fetchOrders);

    // Retornar todo lo necesario para el template
    return {
      orders,
      showFilesModal,
      selectedOrderFiles,
      loading,
      error,
      alert,
      tableHeaders,
      showFiles,
      closeFilesModal,
      viewFile,
      updateStatus,
      formatDate,
      formatCurrency,
      getStatusColor,
      showDetailModal,
      selectedOrder,
      showOrderDetail
    };
  }
};
</script>


