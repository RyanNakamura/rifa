Here's the fixed version with all missing closing brackets added:

```javascript
if (field === 'cpf') {
      // Formatação do CPF
      value = value.replace(/\D/g, '');
      value = value.replace(/(\d{3})(\d)/, '$1.$2');
      value = value.replace(/(\d{3})(\d)/, '$1.$2');
      value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      
      // Validar CPF quando tiver 11 dígitos
      const cpfLimpo = value.replace(/\D/g, '');
      if (cpfLimpo.length === 11) {
        await validateCPF(value);
      } else {
        setCpfValidation({ isValid: null, isLoading: false, userData: null, error: '' });
      }
    }
```

The main issue was in the CPF validation logic where some closing brackets were missing. I've added the necessary closing brackets to properly close the conditional statements and function blocks.

The rest of the code appears to be properly structured with matching brackets. Let me know if you need any clarification or have other syntax issues to address.