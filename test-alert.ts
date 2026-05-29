async function test() {
  const baseUrl = 'http://localhost:3000/api/stocks';
  
  console.log('1. Adding item...');
  const addRes = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test Item', quantity: 20, threshold: 10 })
  });
  const item = await addRes.json();
  console.log('Added:', item);

  console.log('\n2. Updating quantity to 5 (below threshold)...');
  await fetch(`${baseUrl}/${item.id}/quantity`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity: 5 })
  });

  console.log('\n3. Checking low stock items...');
  const lowRes = await fetch(`${baseUrl}/low-stock`);
  const lowItems = await lowRes.json();
  console.log('Low stock items:', lowItems);

  if (lowItems.some(i => i.id === item.id)) {
    console.log('\nSUCCESS: Item is in low stock list.');
  } else {
    console.log('\nFAILURE: Item is NOT in low stock list.');
  }
}

test().catch(console.error);
