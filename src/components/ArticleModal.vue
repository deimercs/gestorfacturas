<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg w-full max-w-2xl p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-bold">Agregar Artículo</h3>
        <button @click="$emit('close')" class="text-gray-500 hover:text-gray-700">
          ×
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Proveedor con búsqueda -->
        <div>
          <label class="block text-sm font-medium text-gray-700">Proveedor</label>
          <div class="relative">
            <input
              type="text"
              v-model="providerSearch"
              @input="searchProviders"
              placeholder="Buscar proveedor por nombre o NIT"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <!-- Resultados de búsqueda -->
            <div
              v-if="showProviderResults && filteredProviders.length"
              class="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-md border"
            >
              <div
                v-for="provider in filteredProviders"
                :key="provider.id"
                @click="selectProvider(provider)"
                class="p-2 hover:bg-gray-100 cursor-pointer"
              >
                {{ provider.name }} - NIT: {{ provider.document_number }}
              </div>
            </div>
            <!-- Proveedor seleccionado -->
            <div v-if="selectedProvider" class="mt-2 p-2 bg-gray-50 rounded">
              <p class="font-medium">Proveedor seleccionado:</p>
              <p>
                {{ selectedProvider.name }} - NIT: {{ selectedProvider.document_number }}
              </p>
            </div>
            <button
              type="button"
              @click="showProviderCreateModal = true"
              class="mt-2 px-4 py-2 bg-[#f15025] text-white rounded hover:bg-[#d13815]"
            >
              + Nuevo Proveedor
            </button>
          </div>
        </div>

        <!-- Descripción -->
        <div>
          <label class="block text-sm font-medium text-gray-700">Descripción</label>
          <textarea
            v-model="form.description"
            required
            rows="3"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          ></textarea>
        </div>

        <!-- Cantidad y Precio -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Cantidad</label>
            <input
              type="number"
              v-model.number="form.quantity"
              required
              min="1"
              @input="calculateTotals"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Precio Unitario</label>
            <input
              type="number"
              v-model.number="form.unitPrice"
              required
              min="0"
              @input="calculateTotals"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        <!-- Funcionalidad para omitir IVA -->
        <div class="mt-4">
          <label class="flex items-center">
            <input
              type="checkbox"
              v-model="form.noIva"
              @change="calculateTotals"
              class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <span class="ml-2 text-sm text-gray-600">No aplica IVA</span>
          </label>
        </div>

        <!-- Totales (calculados automáticamente) -->
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Subtotal</label>
            <input
              type="number"
              v-model.number="form.subtotal"
              readonly
              class="mt-1 block w-full rounded-md border-gray-300 bg-gray-50"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">IVA (19%)</label>
            <input
              type="number"
              v-model.number="form.iva"
              readonly
              class="mt-1 block w-full rounded-md border-gray-300 bg-gray-50"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Total</label>
            <input
              type="number"
              v-model.number="form.total"
              readonly
              class="mt-1 block w-full rounded-md border-gray-300 bg-gray-50"
            />
          </div>
        </div>

        <div class="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            @click="$emit('close')"
            class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-[#f15025] hover:bg-[#d13815]"
            :disabled="!isValid"
          >
            Agregar
          </button>
        </div>
      </form>
    </div>

    <!-- Modal para crear nuevo proveedor -->
    <ProviderModal
      v-if="showProviderCreateModal"
      @close="showProviderCreateModal = false"
      @provider-added="onProviderAdded"
    />
  </div>
</template>

<script>
import { ref, computed } from "vue";
import ProviderModal from "./ProviderModal.vue";
import axios from "axios";

export default {
  name: "ArticleModal",
  components: {
    ProviderModal,
  },
  emits: ["close", "article-added"],
  setup(props, { emit }) {
    const form = ref({
      description: "",
      quantity: 1,
      unitPrice: 0,
      subtotal: 0,
      iva: 0,
      total: 0,
      noIva: false,
    });

    const providerSearch = ref("");
    const selectedProvider = ref(null);
    const filteredProviders = ref([]);
    const showProviderResults = ref(false);
    const showProviderCreateModal = ref(false);

    const calculateTotals = () => {
      form.value.subtotal = form.value.quantity * form.value.unitPrice;
      form.value.iva = form.value.noIva ? 0 : form.value.subtotal * 0.19;
      form.value.total = form.value.subtotal + form.value.iva;
    };

    const searchProviders = async () => {
      if (!providerSearch.value) {
        filteredProviders.value = [];
        showProviderResults.value = false;
        return;
      }

      try {
        const response = await axios.get(
          `http://localhost:3001/providers/search?query=${providerSearch.value}`
        );
        filteredProviders.value = response.data;
        showProviderResults.value = true;
      } catch (error) {
        console.error("Error al buscar proveedores:", error);
      }
    };

    const selectProvider = (provider) => {
      selectedProvider.value = provider;
      showProviderResults.value = false;
      providerSearch.value = "";
    };

    const onProviderAdded = (provider) => {
      selectedProvider.value = provider;
      showProviderCreateModal.value = false;
    };

    const handleSubmit = () => {
      const articleData = {
        ...form.value,
        providerId: selectedProvider.value.id,
        providerName: selectedProvider.value.name,
        noIva: form.value.noIva,
      };
      emit("article-added", articleData);
      emit("close");
    };

    const isValid = computed(() => {
      return (
        selectedProvider.value &&
        form.value.description &&
        form.value.quantity > 0 &&
        form.value.unitPrice > 0
      );
    });

    return {
      form,
      providerSearch,
      selectedProvider,
      filteredProviders,
      showProviderResults,
      showProviderCreateModal,
      isValid,
      calculateTotals,
      searchProviders,
      selectProvider,
      onProviderAdded,
      handleSubmit,
    };
  },
};
</script>
