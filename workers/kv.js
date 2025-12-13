globalThis.handle = async function (body) {
    const key = "count";
  
    // Get current count
    let count = await KV.get(key);
    count = Number(count || 0) + 1;
  
    // Save new count
    await KV.put(key, count);
  
    return `This endpoint has been visited ${count} times`;
  };
  