globalThis.handle = async function (req) {
    const data = await req.json();
    
    return new Response(JSON.stringify({
      method: req.method,
      data
    }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  