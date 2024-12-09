```vue
<template>
  <div class="min-h-screen bg-gray-100 py-8 px-4">
    <!-- Alert -->
    <div v-if="alert" :class="`fixed top-4 right-4 p-4 rounded-md ${alert.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`">
      {{ alert.message }}
    </div>

    <!-- Form Container -->
    <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <h2 class="text-2xl font-bold text-gray-900 mb-6">Nueva Orden No: {{ nextConsecutive }}</h2>

      <form @submit.prevent="handleSubmit" class="space-y-8">
        <!-- Sección 1: Información del Documento -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="font-semibold mb-4 text-lg">Información del Documento</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Tipo de Gestión</label>
              <select 
                v-model="form.document_type"
                required
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Seleccione tipo</option>
                <option value="FACTURA">Factura</option>
                <option value="ORDEN_COMPRA">Orden de Compra</option>
                <option value="CUENTA_COBRO">Cuenta de Cobro</option>
                <option value="COTIZACION">Cotización</option>
              </select>
            </div>

            <!-- Cliente con búsqueda -->
            <div>
              <label class="block text-sm font-medium text-gray-700"></label>
              <div class="relative">
              <label class="block text-sm font-medium text-gray-700">Cliente</label>
              <div class="relative">
                <input
                  type="text"
                  v-model="clientSearch"
                  @input="debouncedSearch"
                  @focus="showClientResults = true"
                  placeholder="Buscar cliente por nombre o documento"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                
                <!-- Lista desplegable de resultados -->
                <div 
                  v-if="showClientResults && filteredClients.length > 0" 
                  class="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-auto border border-gray-200"
                >
                  <div 
                    v-for="client in filteredClients" 
                    :key="client.id"
                    @click="selectClient(client)"
                    class="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
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
                    <button 
                      @click="clearSelectedClient" 
                      class="text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            </div>

  <!-- Botón para nuevo cliente -->
  <button 
    type="button"
    @click="showClientModal = true"
    class="mt-2 px-4 py-2 bg-[#f15025] text-white rounded-md hover:bg-[#d13815] text-sm"
  >
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
                    <p><span class="font-medium">IVA:</span> {{ formatCurrency(article.iva) }}</p>
                    <p><span class="font-medium">Total:</span> {{ formatCurrency(article.total) }}</p>
                  </div>
                </div>
                <button 
                  type="button" 
                  @click="removeArticle(index)"
                  class="text-red-600 hover:text-red-800"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>

          <!-- Botón para agregar artículo -->
          <button 
            type="button"
            @click="showArticleModal = true"
            class="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Agregar Artículo
          </button>
        </div>

        <!-- Sección 3: Información Adicional -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="font-semibold mb-4 text-lg">Información Adicional</h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Factura de Compra</label>
              <input 
                v-model="form.providerInvoice"
                type="text"
                required
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Fecha de Vencimiento</label>
              <input 
                v-model="form.dueDate"
                type="date"
                required
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
            </div>
          </div>

          <div class="mt-4">
            <label class="block text-sm font-medium text-gray-700">Estado</label>
            <select 
              v-model="form.status"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="pendiente_facturar ">Pendiente por Facturar</option>
              <option value="facturado">Facturado</option>
              <option value="seguimiento">En Seguimiento</option>
              <option value="anulado">Anulado</option>
            </select>
          </div>

          <div class="mt-4">
            <label class="block text-sm font-medium text-gray-700">Adjuntar Documentos (Solo PDF)</label>
            <input 
              type="file"
              accept="application/pdf"
              multiple
              @change="handleFileUpload"
              class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            >
          </div>
        </div>

        <!-- Botones de acción -->
        <div class="flex justify-end space-x-4">
          <router-link
            to="/orders"
            class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
          >
            Ver Listado
          </router-link>
          <button 
            type="submit"
            class="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-[#f15025] hover:bg-[#d13815]"
          >
            Guardar
          </button>
        </div>
      </form>
    </div>

    <!-- Modal para nuevo artículo -->
    <ArticleModal 
      v-if="showArticleModal"
      @close="showArticleModal = false"
      @article-added="addArticle"
    />

    <!-- Modal para nuevo cliente -->
    <ClientModal 
      v-if="showClientModal"
      @close="showClientModal = false"
      @client-added="onClientAdded"
    />
  </div>
</template>
```

```javascript
<script>
import { ref, onMounted, watch } from 'vue';
import axios from 'axios';
import debounce from 'lodash/debounce';
import ArticleModal from './ArticleModal.vue';
import ClientModal from './ClientModal.vue';

export default {
  name: 'OrderForm',
  components: {
    ArticleModal,
    ClientModal
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

    // Funciones para manejo de archivos
    const handleFileUpload = (event) => {
      const files = Array.from(event.target.files);
      selectedFiles.value = files.filter(file => file.type === 'application/pdf');
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

    const showAlert = (message, type = 'error') => {
      alert.value = { message, type };
      setTimeout(() => alert.value = null, 3000);
    };

    // Funciones de formulario
    const resetForm = () => {
      form.value = {
        document_type: '',
        providerInvoice: '',
        dueDate: '',
        status: 'pendiente_facturar',
        clientId: null
      };
      articles.value = [];
      selectedClient.value = null;
      clientSearch.value = '';
      selectedFiles.value = [];
    };
    const handleSubmit = async () => {
          console.log('Estado del formulario:', {
            form: form.value,
            selectedClient: selectedClient.value,
            articles: articles.value
          });

          // Validaciones
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

          try {
            const orderData = {
              document_type: form.value.document_type,
              order_consecutive: nextConsecutive.value,
              order_number: `${form.value.document_type}-${nextConsecutive.value}`,
              client_id: selectedClient.value.id,
              provider_id: articles.value[0].providerId,
              articles: articles.value,
              details: articles.value[0].description,
              unit_price: articles.value[0].unitPrice,
              quantity: articles.value[0].quantity,
              subtotal: articles.value.reduce((sum, art) => sum + Number(art.subtotal), 0),
              iva: articles.value.reduce((sum, art) => sum + Number(art.iva), 0),
              total: articles.value.reduce((sum, art) => sum + Number(art.total), 0),
              provider_invoice: form.value.providerInvoice,
              due_date: form.value.dueDate,
              status: form.value.status || 'pendiente_facturar'
            };

            console.log('Datos a enviar al servidor:', orderData);

            const formData = new FormData();
            formData.append('orderData', JSON.stringify(orderData));
            
            if (selectedFiles.value.length) {
              selectedFiles.value.forEach(file => formData.append('files', file));
            }

            console.log('FormData contents:');
            for (let pair of formData.entries()) {
                console.log(pair[0], pair[1]);
            }

            const response = await axios.post('http://localhost:3001/orders', formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });

            console.log('Respuesta del servidor:', response.data);
            showAlert('Orden creada exitosamente', 'success');
            resetForm();
          } catch (error) {
            console.error('Error detallado:', error.response?.data || error);
            showAlert(error.response?.data?.error || 'Error al crear la orden');
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
            const response = await axios.get('http://localhost:3001/next-consecutive');
            nextConsecutive.value = response.data.consecutive;
          } catch (error) {
            showAlert('Error al cargar consecutivo');
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
      debouncedSearch
    };
  }
};
</script>
```