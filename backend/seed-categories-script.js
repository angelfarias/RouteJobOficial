const fetch = require('node-fetch');

async function seedCategories() {
  try {
    console.log('🌱 Seeding job categories...');
    
    const response = await fetch('http://localhost:3001/categories/seed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    console.log('✅ Result:', result.message);
    
  } catch (error) {
    console.error('❌ Error seeding categories:', error.message);
    console.log('Make sure the backend server is running on port 3001');
  }
}

// Run the seeding
seedCategories();