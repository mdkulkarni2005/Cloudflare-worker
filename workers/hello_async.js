globalThis.handle = async function (body) {
  const api = await fetch("https://api.github.com");

  return `Edge says hi ${body} — remote status ${api.status}`;
};
