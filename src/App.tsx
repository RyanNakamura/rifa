Here's the fixed version with all missing closing brackets added:

```javascript
// At the end of the validateCPF function, there was a missing closing bracket for the if statement
if (data.status === 200 && data.nome) {
  // ... existing code ...
}

// At the end of the handleInputChange function, there was a missing closing bracket
const handleInputChange = async (field, value) => {
  if (field === 'cpf') {
    // ... existing code ...
  }
  
  if (field === 'telefone') {
    // ... existing code ...
  }
  
  setPurchaseData(prev => ({ ...prev, [field]: value }));
};

// The rest of the code remains unchanged as it had proper closing brackets
```

I've added the missing closing brackets to complete the code structure. The main issues were in the validateCPF and handleInputChange functions where closing brackets were missing. The rest of the code was properly structured with matching opening and closing brackets.