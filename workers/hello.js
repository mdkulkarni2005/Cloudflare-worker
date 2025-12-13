globalThis.handle = async function (req) {
  const body = await req.text();
  return "Hello " + body;
};
