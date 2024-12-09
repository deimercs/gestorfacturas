```vue
<!-- src/components/ClientModal.vue -->
<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
    <div class="bg-white p-6 rounded-lg w-full max-w-md">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-bold">Nuevo Cliente</h3>
        <button @click="$emit('close')" class="text-gray-500 hover:text-gray-700">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Nombre</label>
          <input v-model="form.name" type="text" required 
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
          <span v-if="errors.name" class="text-sm text-red-600">{{ errors.name }}</span>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Tipo de Documento</label>
          <select v-model="form.document_type" required 
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
            <option value="NIT">NIT</option>
            <option value="CC">CC</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Número de Documento</label>
          <input v-model="form.document_number" type="text" required 
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
          <span v-if="errors.document_number" class="text-sm text-red-600">{{ errors.document_number }}</span>
        </div>

        <div class="flex justify-end space-x-3 pt-4">
          <button type="button" @click="$emit('close')"
            class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit"
            class="px-4 py-2 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700">
            Guardar
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style>
@media print {
  body * {
    visibility: hidden;
  }
  #printableArea, #printableArea * {
    visibility: visible;
  }
  #printableArea {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
  }
  .print:hidden {
    display: none;
  }
}
</style>

<script>
import { ref } from 'vue';
import axios from 'axios';


export default {
  name: 'ClientModal',
  emits: ['close', 'client-added'],
  setup(props, { emit }) {
    const form = ref({
      name: '',
      document_type: 'NIT',
      document_number: ''
    });
    const errors = ref({});

    const validateForm = () => {
      errors.value = {};
      let isValid = true;

      if (!form.value.name.trim()) {
        errors.value.name = 'El nombre es requerido';
        isValid = false;
      }

      if (form.value.document_type === 'NIT') {
        if (!/^\d{9}-\d$/.test(form.value.document_number)) {
          errors.value.document_number = 'El NIT debe tener el formato: 123456789-1';
          isValid = false;
        }
      } else {
        if (!/^\d{10}$/.test(form.value.document_number)) {
          errors.value.document_number = 'La cédula debe tener 10 dígitos';
          isValid = false;
        }
      }

      return isValid;
    };

    const handleSubmit = async () => {
      if (!validateForm()) return;

      try {
        const response = await axios.post('http://localhost:3001/clients', form.value);
        emit('client-added', response.data);
      } catch (error) {
        console.error('Error al crear cliente:', error);
        errors.value.general = 'Error al crear el cliente';
      }
    };

    return {
      form,
      errors,
      handleSubmit
    };
  }
};
</script>
```