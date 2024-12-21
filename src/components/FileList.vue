<template>
    <div class="space-y-2">
      <div v-for="(file, index) in files" :key="index" class="flex justify-between items-center p-2 bg-gray-50 rounded">
        <span class="text-sm">{{ file.name }}</span>
        <button 
          @click="removeFile(index)"
          class="text-red-600 hover:text-red-800"
        >
          ×
        </button>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: 'FileList',
    props: {
      files: {
        type: Array,
        required: true
      }
    },
    emits: ['remove'],
    setup(props, { emit }) {
      const removeFile = (index) => {
        emit('remove', index);
      };
  
      return {
        removeFile
      };
    }
  };
  </script>