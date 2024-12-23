```vue
<template>
  <div class="min-h-screen bg-gray-100 py-8 px-4">
    <!-- Alert -->
    <div v-if="alert"
      :class="`fixed top-4 right-4 p-4 rounded-md ${alert.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`">
      {{ alert.message }}
    </div>

    <!-- Form Container -->
    <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <h2 class="text-2xl font-bold text-gray-900 mb-6"> {{ isEditMode ? 'Editar Orden' : `Nueva Orden No:
        ${nextConsecutive}` }}</h2>

      <form @submit.prevent="handleSubmit" class="space-y-8">
        <!-- Sección 1: Información del Documento -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="font-semibold mb-4 text-lg">Información del Documento</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Tipo de Gestión</label>
              <select v-model="form.document_type" required
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                <option value="">Seleccione tipo</option>
                <option value="FACTURA">Factura</option>
                <option value="ORDEN_COMPRA">Orden de Compra</option>
                <option value="CUENTA_COBRO">Cuenta de Cobro</option>
                <option value="COTIZACION">Cotización</option>
              </select>
            </div>

            <!-- Campos de solo lectura en modo edición -->
            <div v-if="isEditMode" class="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Número Consecutivo</label>
                <input
                  v-model="form.order_consecutive"
                  :readonly="readOnlyFields.order_consecutive"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  :class="{ 'bg-gray-100': readOnlyFields.order_consecutive }"
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Número de Orden</label>
                <input
                  v-model="form.order_number"
                  :readonly="readOnlyFields.order_number"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  :class="{ 'bg-gray-100': readOnlyFields.order_number }"
                >
              </div>
            </div>

            <!-- Cliente con búsqueda -->
            <div>
              <label class="block text-sm font-medium text-gray-700"></label>
              <div class="relative">
                <label class="block text-sm font-medium text-gray-700">Cliente</label>
                <div class="relative">
                  <input type="text" v-model="clientSearch" @input="debouncedSearch" @focus="showClientResults = true"
                    placeholder="Buscar cliente por nombre o documento"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />

                  <!-- Lista desplegable de resultados -->
                  <div v-if="showClientResults && filteredClients.length > 0"
                    class="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-auto border border-gray-200">
                    <div v-for="client in filteredClients" :key="client.id" @click="selectClient(client)"
                      class="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0">
                      <div class="font-medium text-gray-900">{{ client.name }}</div>
                      <div class="text-sm text-gray-500">
                        {{ client.document_type }}: {{ client.document_number }}
                      </div>
                    </div>
                  </div>

                  <!-- Cliente seleccionado -->
                  <div v-if="selectedClient" class="mt-2 p-3 bg-gray-50 rounded-md">
                    <div class="flex justify-between items-start">
                      <div>
                        <div class="font-medium">{{ selectedClient.name }}</div>
                        <div class="text-sm text-gray-500">
                          {{ selectedClient.document_type }}: {{ selectedClient.document_number }}
                        </div>
                      </div>
                      <button @click="clearSelectedClient" class="text-gray-400 hover:text-gray-600">
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Botón para nuevo cliente -->
              <button type="button" @click="showClientModal = true"
                class="mt-2 px-4 py-2 bg-[#f15025] text-white rounded-md hover:bg-[#d13815] text-sm">
                + Nuevo Cliente
              </button>
            </div>
          </div>
        </div>

        <!-- Sección 2: Artículos -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="font-semibold mb-4 text-lg">Artículos</h3>

          <!-- Lista de artículos -->
          <div v-if="articles.length" class="mb-4 space-y-4">
            <div v-for="(article, index) in articles" :key="index" class="border p-4 rounded">
              <div class="flex justify-between items-start">
                <div class="space-y-2 w-full">
                  <p><span class="font-medium">Proveedor:</span> {{ article.providerName }}</p>
                  <p><span class="font-medium">Descripción:</span> {{ article.description }}</p>
                  <div class="grid grid-cols-4 gap-4">
                    <p><span class="font-medium">Cantidad:</span> {{ article.quantity }}</p>
                    <p><span class="font-medium">Precio Unit:</span> {{ formatCurrency(article.unitPrice) }}</p>
                    <p>
                      <span class="font-medium">IVA:</span>
                      {{ article.noIva ? 'No Aplica' : formatCurrency(article.iva) }}
                    </p>
                    <p><span class="font-medium">Total:</span> {{ formatCurrency(article.total) }}</p>
                  </div>

                  <div class="mt-4">
                    <label class="flex items-center">
                      <input type="checkbox" v-model="form.noIva" @change="calculateTotals"
                        class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50">
                      <span class="ml-2 text-sm text-gray-600">No aplica IVA</span>
                    </label>
                  </div>
                </div>



                <button type="button" @click="removeArticle(index)" class="text-red-600 hover:text-red-800">
                  Eliminar
                </button>
              </div>
            </div>
          </div>

          <!-- Botón para agregar artículo -->
          <button type="button" @click="showArticleModal = true"
            class="w-full py-2 bg-[#2d1e2f] text-white rounded hover:bg-blue-700">
            + Agregar Artículo
          </button>
        </div>

        <!-- Sección 3: Información Adicional -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="font-semibold mb-4 text-lg">Información Adicional</h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Factura de Compra</label>
              <input v-model="form.providerInvoice" type="text" required
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Fecha de Vencimiento</label>
              <input v-model="form.dueDate" type="date" required
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
            </div>
          </div>

          <div class="mt-4">
            <label class="block text-sm font-medium text-gray-700">Estado</label>
            <select v-model="form.status" required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
              <option value="pendiente_facturar">Pendiente por Facturar</option>
              <option value="facturado">Facturado</option>
              <option value="seguimiento">En Seguimiento</option>
              <option value="anulado">Anulado</option>
            </select>
          </div>

          <div class="mt-4">
            <label class="block text-sm font-medium text-gray-700">Adjuntar Documentos (Solo PDF)</label>
            <input type="file" accept="application/pdf" multiple @change="handleFileUpload"
              class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100">
            <!-- Lista de archivos seleccionados -->
            <FileList :files="selectedFiles" @remove="removeFile" class="mt-2" />
            <!-- Lista de archivos existentes en modo edición -->
            <div v-if="isEditMode" class="mt-4">
              <h4 class="font-medium mb-2">Archivos adjuntos existentes</h4>
              <FileList :files="existingFiles" @remove="removeExistingFile" />
            </div>
          </div>
        </div>

        <!-- Botones de acción -->
        <div class="flex justify-end space-x-4">
          <router-link to="/orders"
            class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50">
            Ver Listado
          </router-link>
          <button type="submit"
            class="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-[#f15025] hover:bg-[#d13815]">
            {{ isEditMode ? 'Actualizar' : 'Guardar' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Modal para nuevo artículo -->
    <ArticleModal v-if="showArticleModal" @close="showArticleModal = false" @article-added="addArticle" />

    <!-- Modal para nuevo cliente -->
    <ClientModal v-if="showClientModal" @close="showClientModal = false" @client-added="onClientAdded" />
  </div>
</template>
```

```javascript
<script>
import { ref, onMounted, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import debounce from 'lodash/debounce';
import ArticleModal from './ArticleModal.vue';
import ClientModal from './ClientModal.vue';
import FileList from './FileList.vue';

export default {
  name: 'OrderForm',
  components: {
    ArticleModal,
    ClientModal,
    FileList
  },
  setup() {
    // Estados del formulario
    const form = ref({
      document_type: '',
      providerInvoice: '',
      dueDate: '',
      status: 'pendiente_facturar',
      clientId: null
    });

    const route = useRoute();
    const router = useRouter();
    const isEditMode = computed(() => route.params.id);

    const readOnlyFields = computed(() => ({
        order_consecutive: isEditMode.value,
        order_number: isEditMode.value,
      }));

    // Estados para archivos y consecutivo
    const selectedFiles = ref([]);
    const nextConsecutive = ref('0000');

    // Estados para artículos
    const articles = ref([]);
    const showArticleModal = ref(false);

    // Estados para búsqueda de cliente
    const clientSearch = ref('');
    const filteredClients = ref([]);
    const showClientResults = ref(false);
    const selectedClient = ref(null);
    const showClientModal = ref(false);

    // Estado para alertas
    const alert = ref(null);

    const existingFiles = ref([]);

    const loadOrderData = async () => {
      try {
        console.log('Cargando orden:', route.params.id);
        
        const [orderResponse, filesResponse] = await Promise.all([
          axios.get(`http://localhost:3001/orders/${route.params.id}`),
          axios.get(`http://localhost:3001/orders/${route.params.id}/files`)
        ]);

        const orderData = orderResponse.data;
        console.log('Datos de orden recibidos:', orderData);

        // Llenar form con todos los datos
        form.value = {
          document_type: orderData.document_type,
          order_consecutive: orderData.order_consecutive,
          order_number: orderData.order_number,
          providerInvoice: orderData.provider_invoice,
          dueDate: orderData.due_date?.split('T')[0],
          status: orderData.status || 'pendiente_facturar',
          clientId: orderData.client_id,
          noIva: false
        };

        // Establecer cliente
        selectedClient.value = {
          id: orderData.client_id,
          name: orderData.client_name,
          document_type: orderData.client_document_type,
          document_number: orderData.client_document_number
        };

        // Cargar archivos existentes
        existingFiles.value = filesResponse.data.map(file => ({
          id: file.id,
          name: file.file_name,
          file_path: file.file_path,
          file_name: file.file_name
        }));

        // Cargar artículos
        articles.value = orderData.items.map(item => ({
          providerId: item.provider_id,
          providerName: item.provider_name,
          description: item.details,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unit_price),
          subtotal: Number(item.subtotal),
          iva: Number(item.iva),
          total: Number(item.total),
          noIva: item.iva === 0
        }));

        console.log('Artículos cargados:', articles.value);
        console.log('Archivos cargados:', existingFiles.value);
        console.log('Formulario actualizado:', form.value);

      } catch (error) {
        console.error('Error al cargar orden:', error);
        showAlert('Error al cargar los datos de la orden');
      }
    };


    // Funciones para manejo de archivos
    const handleFileUpload = (event) => {
      const files = Array.from(event.target.files);
      selectedFiles.value = files.filter(file => file.type === 'application/pdf');
    };

    const removeFile = (index) => {
      selectedFiles.value.splice(index, 1);
    };

    // Función para eliminar archivo existente

    const removeExistingFile = async (fileId) => {
  try {
    console.log('Intentando eliminar archivo con ID:', fileId);
    
    if (!fileId) {
      console.error('ID de archivo inválido');
      return;
    }

    await axios.delete(`http://localhost:3001/files/${fileId}`);
    existingFiles.value = existingFiles.value.filter(f => f.id !== fileId);
    showAlert('Archivo eliminado correctamente', 'success');
  } catch (error) {
    console.error('Error al eliminar archivo:', error);
    showAlert('Error al eliminar el archivo', 'error');
  }
};

    // Funciones para búsqueda de cliente
    const searchClients = async () => {
      try {
        if (!clientSearch.value || clientSearch.value.length < 2) {
          filteredClients.value = [];
          showClientResults.value = false;
          return;
        }

        console.log('Iniciando búsqueda de clientes:', clientSearch.value);
        const response = await axios.get('http://localhost:3001/clients/search', {
          params: { query: clientSearch.value },
          headers: { 'Accept': 'application/json' }
        });

        filteredClients.value = response.data;
        showClientResults.value = true;
      } catch (error) {
        console.error('Error en búsqueda:', error.response?.data || error.message);
        showAlert('Error al buscar clientes');
      }
    };

    const debouncedSearch = debounce(() => {
      if (clientSearch.value) searchClients();
    }, 300);

    const selectClient = (client) => {
      selectedClient.value = client;
      form.value.clientId = client.id;
      showClientResults.value = false;
      clientSearch.value = '';
    };

    const clearSelectedClient = () => {
      selectedClient.value = null;
      form.value.clientId = null;
    };

    // Funciones para artículos
    const addArticle = (article) => {
      articles.value.push(article);
      showArticleModal.value = false;
    };

    const removeArticle = (index) => {
      articles.value.splice(index, 1);
    };

    // Funciones de utilidad
    const formatCurrency = (value) => {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
      }).format(value);
    };

    // En OrderForm.vue, mejorar la función showAlert:
    const showAlert = (message, type = 'error') => {
  alert.value = {
    message,
    type,
    timestamp: Date.now()
  };
  
  setTimeout(() => {
    if (alert.value?.timestamp === Date.now()) {
      alert.value = null;
    }
  }, 3000);
};

    // Funciones de formulario
    const resetForm = () => {
  form.value = {
    document_type: '',
    providerInvoice: '',
    dueDate: '',
    status: 'pendiente_facturar',
    clientId: null,
    noIva: false
  };
  articles.value = [];
  selectedClient.value = null;
  clientSearch.value = '';
  selectedFiles.value = [];
  showAlert('Formulario limpiado exitosamente', 'success');
};

const handleSubmit = async () => {
  try {
    // Validaciones iniciales
    if (!form.value.document_type) {
      showAlert('Seleccione el tipo de documento');
      return;
    }
    if (!selectedClient.value) {
      showAlert('Seleccione un cliente');
      return;
    }
    if (!articles.value.length) {
      showAlert('Debe agregar al menos un artículo');
      return;
    }
    if (!form.value.providerInvoice) {
      showAlert('Ingrese la factura de proveedor');
      return;
    }
    if (!form.value.dueDate) {
      showAlert('Seleccione la fecha de vencimiento');
      return;
    }

    // Preparar datos de la orden
    const orderData = {
      document_type: form.value.document_type,
      client_id: selectedClient.value.id,
      articles: articles.value.map(article => ({
        providerId: article.providerId,
        description: article.description,
        quantity: article.quantity,
        unitPrice: article.unitPrice,
        subtotal: article.subtotal,
        iva: article.iva,
        total: article.total,
        noIva: article.noIva
      })),
      provider_invoice: form.value.providerInvoice,
      due_date: form.value.dueDate,
      status: form.value.status,
      provider_id: articles.value[0].providerId,
      details: articles.value[0].description,
      unit_price: articles.value[0].unitPrice,
      quantity: articles.value[0].quantity,
      subtotal: articles.value.reduce((sum, art) => sum + Number(art.subtotal), 0),
      iva: articles.value.reduce((sum, art) => sum + Number(art.iva), 0),
      total: articles.value.reduce((sum, art) => sum + Number(art.total), 0)
    };

    if (isEditMode.value) {
  try {
    const formData = new FormData();
    
    // Asegurarnos de que los datos estén bien estructurados
    const orderDataToSend = {
      document_type: form.value.document_type,
      client_id: selectedClient.value.id,
      articles: articles.value.map(article => ({
        providerId: article.providerId,
        description: article.description,
        quantity: article.quantity,
        unitPrice: article.unitPrice,
        subtotal: article.subtotal,
        iva: article.iva,
        total: article.total,
        noIva: article.noIva
      })),
      provider_invoice: form.value.providerInvoice,
      due_date: form.value.dueDate,
      status: form.value.status,
      provider_id: articles.value[0].providerId,
      details: articles.value[0].description,
      unit_price: articles.value[0].unitPrice,
      quantity: articles.value[0].quantity,
      subtotal: articles.value.reduce((sum, art) => sum + Number(art.subtotal), 0),
      iva: articles.value.reduce((sum, art) => sum + Number(art.iva), 0),
      total: articles.value.reduce((sum, art) => sum + Number(art.total), 0)
    };

    // Agregar los datos como string JSON
    formData.append('orderData', JSON.stringify(orderDataToSend));

    // Agregar archivos si existen
    if (selectedFiles.value && selectedFiles.value.length > 0) {
      selectedFiles.value.forEach(file => {
        formData.append('files', file);
      });
    }

    // Log para debugging
    console.log('Datos a enviar:', JSON.stringify(orderDataToSend, null, 2));

    await axios.put(
      `http://localhost:3001/orders/${route.params.id}`,
      formData,
      {
        headers: { 
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    showAlert('Orden actualizada exitosamente', 'success');
    
    // Esperar antes de redirigir
    setTimeout(() => {
      router.push('/orders');
    }, 2000);
  } catch (error) {
    console.error('Error en actualización:', error);
    showAlert(error.response?.data?.message || 'Error al actualizar la orden');
  }
}
    
    else {
      // Modo creación
      const formData = new FormData();
      orderData.order_consecutive = nextConsecutive.value;
      orderData.order_number = `${form.value.document_type}-${nextConsecutive.value}`;
      
      formData.append('orderData', JSON.stringify(orderData));

      if (selectedFiles.value.length) {
        selectedFiles.value.forEach(file => formData.append('files', file));
      }

      await axios.post('http://localhost:3001/orders', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      showAlert('Orden creada exitosamente', 'success');
      resetForm();
      
      // Actualizar consecutivo
      const consecutiveResponse = await axios.get('http://localhost:3001/next-consecutive');
      nextConsecutive.value = consecutiveResponse.data.consecutive;
    }
  } catch (error) {
    console.error('Error al procesar la orden:', error);
    showAlert(error.response?.data?.error || 'Error al procesar la orden', 'error');
  }
};
    // Efectos y watchers
    watch(clientSearch, (newValue) => {
      if (newValue) {
        debouncedSearch();
      } else {
        filteredClients.value = [];
        showClientResults.value = false;
      }
    });

    onMounted(async () => {
      try {
        if (isEditMode.value) {
          await loadOrderData();
        } else {
          const response = await axios.get('http://localhost:3001/next-consecutive');
          nextConsecutive.value = response.data.consecutive;
        }
      } catch (error) {
        showAlert('Error al cargar datos iniciales');
      }

      // Event listener para cerrar dropdown al hacer click fuera
      document.addEventListener('click', (e) => {
        const dropdown = document.querySelector('.client-dropdown');
        const searchInput = document.querySelector('.client-search');
        if (!dropdown?.contains(e.target) && !searchInput?.contains(e.target)) {
          showClientResults.value = false;
        }
      });
    });

    return {
      // Estados del formulario
      form,
      selectedFiles,
      nextConsecutive,
      articles,
      showArticleModal,
      clientSearch,
      filteredClients,
      showClientResults,
      selectedClient,
      showClientModal,
      alert,
      isEditMode,
      existingFiles,
      readOnlyFields,

      // Funciones 
      handleFileUpload,
      searchClients,
      selectClient,
      clearSelectedClient,
      addArticle,
      removeArticle,
      formatCurrency,
      handleSubmit,
      showAlert,
      debouncedSearch,
      removeFile,
      removeExistingFile
    };
  }
};
</script>
```