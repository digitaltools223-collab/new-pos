const fs = require('fs');

try {
  const data = JSON.parse(fs.readFileSync('database.json', 'utf8'));
  
  // Clear transactions
  data.sales = [];
  data.saleItems = [];
  data.exchanges = [];
  data.returns = [];
  
  // Reset stock movements to just the current stock
  const newStockMovements = [];
  data.products.forEach(p => {
    newStockMovements.push({
      id: "m_reset_" + p.id,
      productId: p.id,
      movementType: "MANUAL_ADJUSTMENT",
      quantity: p.stock,
      previousStock: 0,
      newStock: p.stock,
      referenceId: "DB_RESET",
      createdAt: new Date().toISOString()
    });
  });
  
  data.stockMovements = newStockMovements;
  
  fs.writeFileSync('database.json', JSON.stringify(data, null, 2), 'utf8');
  console.log('Database reset successfully!');
} catch (e) {
  console.error(e);
}
