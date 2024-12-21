<template>
  <div class="min-h-screen bg-gray-100 py-8 px-4">
    <!-- Alert -->
    <div
      v-if="alert"
      :class="`fixed top-4 right-4 p-4 rounded-md ${
        alert.type === 'success'
          ? 'bg-green-100 text-green-700'
          : 'bg-red-100 text-red-700'
      }`"
    >
      {{ alert.message }}
    </div>

    <div class="overflow-x-auto w-full">
      <!-- Header con botón para crear nueva orden -->
      <div class="flex justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Listado de Órdenes</h1>
        <router-link
          to="/orders/create"
          class="bg-[#2d1e2f] text-white px-4 py-2 rounded hover:bg-[#3d2e3f]"
        >
          Nueva Orden
        </router-link>
      </div>

     

<!-- Agregar aquí los filtros -->
      <div class="flex justify-center mb-4">
        <div class="bg-[#2d1e2f] p-4 rounded-lg shadow w-2/3 max-w-2xl">
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-white ">Fecha Inicial</label>
              <input
                type="date"
                v-model="filters.startDate"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-white ">Fecha Final</label>
              <input
                type="date"
                v-model="filters.endDate"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div class="flex items-end">
              <button 
                @click="applyFilters"
                class="px-4 py-2 bg-[#f15025] text-white rounded hover:bg-blue-700 w-full"
              >
                Filtrar
              </button>
            </div>
          </div>
        </div>
      </div>
      <!-- Tabla de órdenes -->
      <div class="bg-white shadow-lg rounded-lg overflow-hidden">
        <table class="min-w-full">
          <thead class="bg-gray-50">
            <tr>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
              >
                Número Doc
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
              >
                Cliente
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
              >
                Detalles
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
              >
                Subtotal
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
              >
                IVA
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
              >
                Total
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
              >
                FC
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
              >
                Vencimiento
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
              >
                Estado
              </th>
              <th
                class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase"
              >
                Acciones
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="order in paginatedOrders" :key="order.id" class="hover:bg-gray-50">
              <td class="px-4 py-4">{{ order.order_number }}</td>
              <td class="px-4 py-4">{{ order.client_name }}</td>
              <td class="px-4 py-4"> {{ order.details_list || order.items[0].details }}</td>
              <td class="px-4 py-4">{{ formatCurrency(order.subtotal) }}</td>
              <td class="px-4 py-4">{{ formatCurrency(order.iva) }}</td>
              <td class="px-4 py-4">{{ formatCurrency(order.total) }}</td>
              <td class="px-4 py-4">{{ order.provider_invoice }}</td>
              <td class="px-4 py-4">{{ formatDate(order.due_date) }}</td>
              <td class="px-4 py-4">
                <select
                  v-model="order.status"
                  @change="updateStatus(order)"
                  :class="`rounded-full px-3 py-1 text-sm font-semibold ${getStatusColor(
                    order.status
                  )}`"
                >
                  <option value="pendiente_facturar">
                    Pendiente por Facturar
                  </option>
                  <option value="facturado">Facturado</option>
                  <option value="seguimiento">En Seguimiento</option>
                  <option value="anulado">Anulado</option>
                </select>
              </td>
              <td class="px-4 py-4 flex justify-center space-x-3">
                <button
                  @click="showOrderDetail(order)"
                  class="text-blue-600 hover:text-blue-800"
                >
                  <EyeIcon class="h-5 w-5" />
                </button>
                <button
                  @click="showFiles(order)"
                  class="text-blue-600 hover:text-blue-800"
                >
                  <FileIcon class="h-5 w-5" />
                </button>
                <router-link
                  :to="`/orders/edit/${order.id}`"
                  class="text-green-600 hover:text-green-800"
                >
                  <PencilIcon class="h-5 w-5" />
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
<div class="mt-4 flex items-center justify-between bg-white px-4 py-3 rounded-lg shadow">
  <div class="flex items-center">
    <span class="text-sm text-gray-700">
      Mostrando {{ startIndex + 1 }} a {{ endIndex }} de {{ pagination.total }} registros
    </span>
  </div>
  <div class="flex items-center space-x-2">
    <select 
      v-model="pagination.pageSize" 
      class="rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
    >
      <option :value="10">10 / página</option>
      <option :value="20">20 / página</option>
      <option :value="50">50 / página</option>
    </select>
    <button 
      @click="prevPage" 
      :disabled="pagination.currentPage === 1"
      class="px-3 py-1 rounded border" 
      :class="pagination.currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'hover:bg-gray-50'"
    >
      Anterior
    </button>
    <button 
      @click="nextPage"
      :disabled="pagination.currentPage >= totalPages"
      class="px-3 py-1 rounded border"
      :class="pagination.currentPage >= totalPages ? 'bg-gray-100 text-gray-400' : 'hover:bg-gray-50'"
    >
      Siguiente
    </button>
  </div>
</div>
    </div>
  </div>

  <!-- Modal para detalles de órden con impresión -->
  <div
    v-if="showDetailModal"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
  >
    <div
      class="bg-white rounded-lg w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto"
    >
      <div class="flex justify-between items-center mb-4 print:hidden">
        <h3 class="text-lg font-bold">Detalle de Orden</h3>
        <div class="flex gap-2">
          <button
            @click="printOrderDetail"
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <PrinterIcon class="h-5 w-5" />
          </button>
          <button
            @click="showDetailModal = false"
            class="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>
      </div>

      <!-- Contenido del detalle (área imprimible) -->
      <div v-if="selectedOrder" class="space-y-4" id="printableArea">
        <!-- Encabezado con logo -->
        <div class="flex justify-between items-start border-b pb-4">
          <div class="flex items-center gap-4">
            <img src="/logo.png" alt="Logo" class="h-16 w-auto" />
            <div>
              <h2 class="text-xl font-bold text-gray-900">
                Branzon Tech S.A.S
              </h2>
              <p class="text-sm text-gray-600">NIT: 901729846-2</p>
              <p class="text-sm text-gray-600">Conjunto Guanabara</p>
              <p class="text-sm text-gray-600">Teléfono: 3168777719</p>
            </div>
          </div>
          <div class="text-right">
            <p class="font-bold text-lg">{{ selectedOrder.order_number }}</p>
            <p class="text-sm text-gray-600">
              Fecha: {{ formatDate(new Date()) }}
            </p>
            <p class="text-sm text-gray-600">
              Vencimiento: {{ formatDate(selectedOrder.due_date) }}
            </p>
            <span
              :class="`px-2 rounded-full text-sm ${getStatusColor(
                selectedOrder.status
              )}`"
            >
              {{ selectedOrder.status }}
            </span>
          </div>
        </div>

        <!-- Información del cliente en OrderList.vue -->
        <div class="bg-gray-50 p-4 rounded">
          <h3 class="font-semibold mb-2">Información del Cliente</h3>
          <p>
            <span class="font-medium">Cliente:</span>
            {{ selectedOrder.client_name }}
          </p>
          <p v-if="selectedOrder.client_document_type">
            <span class="font-medium"
              >{{ selectedOrder.client_document_type }}:</span
            >
            {{ selectedOrder.client_document_number }}
          </p>
        </div>

        <!-- Tabla de artículos -->

        <table class="min-w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-2 text-left">Artículo</th>
                <th class="px-4 py-2 text-left">Proveedor</th>
                <th class="px-4 py-2 text-left">FC Proveedor</th>
                <th class="px-4 py-2 text-right">Cantidad</th>
                <th class="px-4 py-2 text-right">Precio Unit.</th>
                <th class="px-4 py-2 text-right">Subtotal</th>
                <th class="px-4 py-2 text-right">IVA</th>
                <th class="px-4 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in selectedOrder.items" :key="item.id" class="border-b">
                <td class="px-4 py-2">{{ item.details }}</td>
                <td class="px-4 py-2">{{ item.provider_name }}</td>
                <td class="px-4 py-2">{{ item.provider_invoice }}</td>
                <td class="px-4 py-2 text-right">{{ item.quantity }}</td>
                <td class="px-4 py-2 text-right">{{ formatCurrency(item.unit_price) }}</td>
                <td class="px-4 py-2 text-right">{{ formatCurrency(item.subtotal) }}</td>
                <td class="px-4 py-2 text-right">
                  {{ item.noIva ? 'No Aplica' : formatCurrency(item.iva) }}
                </td>
                <td class="px-4 py-2 text-right">{{ formatCurrency(item.total) }}</td>
              </tr>
              <tr class="bg-gray-50 font-bold">
                <td colspan="5" class="px-4 py-2 text-right">Totales:</td>
                <td class="px-4 py-2 text-right">{{ formatCurrency(orderSubtotal) }}</td>
                <td class="px-4 py-2 text-right">{{ formatCurrency(orderIva) }}</td>
                <td class="px-4 py-2 text-right">{{ formatCurrency(orderTotal) }}</td>
              </tr>
            </tbody>
          </table>
        <!-- <table class="min-w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left">Artículo</th>
              <th class="px-4 py-2 text-left">Proveedor</th>
              <th class="px-4 py-2 text-left">FC Proveedor</th>
              <th class="px-4 py-2 text-right">Cantidad</th>
              <th class="px-4 py-2 text-right">Precio Unit.</th>
              <th class="px-4 py-2 text-right">Subtotal</th>
              <th class="px-4 py-2 text-right">IVA</th>
              <th class="px-4 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in selectedOrder.items"
              :key="item.id"
              class="border-b"
            >
              <td class="px-4 py-2">{{ item.details }}</td>
              <td class="px-4 py-2">{{ item.provider_name }}</td>
              <td class="px-4 py-2">{{ item.provider_invoice }}</td>
              <td class="px-4 py-2 text-right">{{ item.quantity }}</td>
              <td class="px-4 py-2 text-right">
                {{ formatCurrency(item.unit_price) }}
              </td>
              <td class="px-4 py-2 text-right">
                {{ formatCurrency(item.subtotal) }}
              </td>
              <td class="px-4 py-2 text-right">
                {{ formatCurrency(item.iva) }}
              </td>
              <td class="px-4 py-2 text-right">
                {{ formatCurrency(item.total) }}
              </td>
            </tr>
            <tr class="bg-gray-50 font-bold">
              <td colspan="5" class="px-4 py-2 text-right">Totales:</td>
              <td class="px-4 py-2 text-right">
                {{ formatCurrency(orderSubtotal) }}
              </td>
              <td class="px-4 py-2 text-right">
                {{ formatCurrency(orderIva) }}
              </td>
              <td class="px-4 py-2 text-right">
                {{ formatCurrency(orderTotal) }}
              </td>
            </tr>
          </tbody>
        </table> -->

        <!-- Pie de página -->
        <div class="mt-8 text-sm text-gray-600 border-t pt-4">
          <p class="mb-2">Observaciones:</p>
          <p class="mb-4">
            Esta orden está sujeta a los términos y condiciones acordados.
          </p>
          <div class="flex justify-between mt-8">
            <div>
              <div class="border-t border-gray-400 w-48 mt-16"></div>
              <p class="mt-2">Firma Autorizada</p>
            </div>
            <div>
              <div class="border-t border-gray-400 w-48 mt-16"></div>
              <p class="mt-2">Recibido</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal para archivos -->
  <div
    v-if="showFilesModal"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
  >
    <div
      class="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto"
    >
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-bold">Archivos adjuntos</h3>
        <button
          @click="closeFilesModal"
          class="text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="text-center py-4">Cargando archivos...</div>

      <!-- Error state -->
      <div v-else-if="error" class="text-red-600 text-center py-4">
        {{ error }}
      </div>

      <!-- Files list -->
      <div v-else-if="selectedOrderFiles.length" class="space-y-4">
        <div
          v-for="file in selectedOrderFiles"
          :key="file.id"
          class="border rounded p-4"
        >
          <div class="flex justify-between items-center mb-2">
            <span class="font-medium">{{ file.file_name }}</span>
            <div class="space-x-2">
              <button
                @click="file.showPreview = !file.showPreview"
                class="text-blue-600 hover:text-blue-800 px-3 py-1 rounded-md border border-blue-600"
              >
                {{ file.showPreview ? "Ocultar" : "Ver" }}
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
              <p>
                Tu navegador no puede mostrar el PDF.
                <a :href="`http://localhost:3001/files/${file.id}`"
                  >Click aquí para descargar</a
                >
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
</template>

<script>
import { ref, onMounted, computed } from "vue";
import axios from "axios";
import { EyeIcon, FileIcon, PencilIcon, PrinterIcon } from "lucide-vue-next";

export default {
  name: "OrderList",
  components: {
    EyeIcon,
    FileIcon,
    PencilIcon,
    PrinterIcon,
  },
  // Estados para manejo de órdenes y UI

  setup() {
    const showDetailModal = ref(false);
    const selectedOrder = ref(null);
    const orders = ref([]);
    const showFilesModal = ref(false);
    const selectedOrderFiles = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const alert = ref(null);

    // Filtros y paginación
    const filters = ref({
        startDate: '',
        endDate: ''
    });

    const pagination = ref({
        currentPage: 1,
        pageSize: 10,
        total: 0
    });

    // Computados para paginación
    const totalPages = computed(() => 
        Math.ceil(pagination.value.total / pagination.value.pageSize)
    );

    const startIndex = computed(() => 
        (pagination.value.currentPage - 1) * pagination.value.pageSize
    );

    const endIndex = computed(() => 
        Math.min(startIndex.value + pagination.value.pageSize, pagination.value.total)
    );

    // Funciones de navegación
    const prevPage = () => {
        if (pagination.value.currentPage > 1) {
            pagination.value.currentPage--;
        }
    };

    const nextPage = () => {
        if (pagination.value.currentPage < totalPages.value) {
            pagination.value.currentPage++;
        }
    };

    // Función para aplicar filtros
    const applyFilters = () => {
      console.log('Aplicando filtros:', filters.value);
      fetchOrders();
    };

    const paginatedOrders = computed(() => {
        const start = (pagination.value.currentPage - 1) * pagination.value.pageSize;
        const end = start + pagination.value.pageSize;
        return orders.value.slice(start, end);
      });


  

    const orderSubtotal = computed(
      () =>
      selectedOrder.value?.items?.reduce((sum, item) => sum + Number(item.subtotal), 0) || 0
    );

    const orderIva = computed(
      () =>
      selectedOrder.value?.items?.reduce((sum, item) => {
        // Si el item tiene noIva, suma 0, si no, suma el IVA
        return sum + (item.noIva ? 0 : Number(item.iva));
      }, 0) || 0
    );

    const orderTotal = computed(
      () =>
        selectedOrder.value?.items?.reduce((sum, item) => sum + Number(item.total), 0) || 0
    );

    const printOrderDetail = () => {
      window.print();
    };

    // Lista de encabezados para la tabla
    const tableHeaders = [
      "Número Doc",
      "Cliente",
      "Detalles",
      "Precio Unit.",
      "Cantidad",
      "Subtotal",
      "IVA",
      "Total",
      "Proveedor",
      "FC Proveedor",
      "Vencimiento",
      "Estado",
    ];
    // const printOrderDetail = () => {
    //   window.print;
    // };
    // Cargar todas las órdenes
    const fetchOrders = async () => {
  try {
    let url = 'http://localhost:3001/orders';
    const params = {};
    if (filters.value.startDate && filters.value.endDate) {
      params.startDate = filters.value.startDate;
      params.endDate = filters.value.endDate;
    }
    
    console.log('Frontend - Enviando request a:', url);
    console.log('Frontend - Params:', JSON.stringify(params, null, 2));

    const response = await axios.get(url, { params });
    console.log('Frontend - Respuesta recibida:', response.data.length, 'órdenes');
    
    orders.value = response.data.map(order => ({
      ...order,
      unit_price: parseFloat(order.unit_price) || 0,
      subtotal: parseFloat(order.subtotal) || 0,
      iva: parseFloat(order.iva) || 0,
      total: parseFloat(order.total) || 0
    }));
    pagination.value.total = orders.value.length;
  } catch (error) {
    console.error('Frontend - Error:', error);
    showAlert('Error al cargar órdenes');
  }
};

    const showOrderDetail = async (order) => {
      try {
        console.log("Consultando detalles de orden:", order.id);
        const response = await axios.get(
          `http://localhost:3001/orders/${order.id}`
        );
        console.log("Datos recibidos del servidor:", response.data);
        selectedOrder.value = response.data;
        showDetailModal.value = true;
      } catch (error) {
        console.error("Error al obtener detalles:", error);
        showAlert("Error al cargar detalles de la orden");
      }
    };

    // Mostrar archivos de una orden
    const showFiles = async (order) => {
      loading.value = true;
      error.value = null;
      showFilesModal.value = true;

      try {
        const response = await axios.get(
          `http://localhost:3001/orders/${order.id}/files`
        );
        selectedOrderFiles.value = response.data.map((file) => ({
          ...file,
          showPreview: false,
        }));
      } catch (err) {
        error.value = "Error al cargar los archivos";
        console.error("Error:", err);
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

    const updateStatus = async (order) => {
      try {
        const response = await axios.put(
          `http://localhost:3001/orders/${order.id}/status`,
          {
            status: order.status,
          }
        );

        if (response.data) {
          showAlert("Estado actualizado correctamente", "success");
        }
      } catch (error) {
        console.error("Error al actualizar estado:", error);
        // Revertir el cambio en la UI
        const originalOrder = orders.value.find((o) => o.id === order.id);
        if (originalOrder) {
          order.status = originalOrder.status;
        }
        showAlert("Error al actualizar estado");
      }
    };

    // Formatear fecha
    const formatDate = (date) => {
      if (!date) return "";
      try {
        return new Date(date).toLocaleDateString("es-CO", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
      } catch (error) {
        console.error("Error al formatear fecha:", error);
        return "";
      }
    };

    // Formatear moneda
    const formatCurrency = (value) => {
      if (value === null || value === undefined || isNaN(value)) {
        return "$ 0";
      }
      return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    };

    // Obtener color según estado
    const getStatusColor = (status) => {
      const colors = {
        pendiente_facturar: "bg-yellow-100 text-yellow-800",
        facturado: "bg-green-100 text-green-800",
        seguimiento: "bg-blue-100 text-blue-800",
      };
      return colors[status] || "bg-gray-100";
    };

    // Mostrar alertas
    const showAlert = (message, type = "error") => {
      alert.value = { message, type };
      setTimeout(() => {
        alert.value = null;
      }, 3000);
    };

    // Cargar datos al montar el componente
    onMounted(fetchOrders);

    // Retornar todo lo necesario para el template
    return {
      filters,
        pagination,
        totalPages,
        startIndex,
        endIndex,
        prevPage,
        nextPage,
        applyFilters,
        orders,
        showFilesModal,
        selectedOrderFiles,
        loading,
        error,
        alert,
        tableHeaders,
        formatCurrency,
        showFiles,
        closeFilesModal,
        viewFile,
        updateStatus,
        formatDate,
        getStatusColor,
        showDetailModal,
        selectedOrder,
        showOrderDetail,
        orderSubtotal,
        orderIva,
        orderTotal,
        paginatedOrders,
        printOrderDetail
    };
  },
};
</script>
