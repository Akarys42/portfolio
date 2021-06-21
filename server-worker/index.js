var mimetypes = require("mime-types")

const setKV = (key, data) => STORAGE.put(key, data)
const getKV = (key) => STORAGE.get(key)
const listKV = () => STORAGE.list()
const deleteKV = (key) => STORAGE.delete(key)

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function uploadAsset(request) {
  console.log("Updating assets")
  if (request.headers.get("Authorization") !== DEPLOY_TOKEN) {
    return new Response("Forbidden", {status: 403})
  }

  let data = {}
  let formData = await request.formData()
  for (const entry of formData.entries()) {
    data[entry[0]] = entry[1]
  }

  let keys = Object.keys(data)

  let existingKeys = (await listKV())["keys"].map(elem => elem["name"])

  let keysToDelete = existingKeys.filter(elem => !(keys.includes(elem) || elem.startsWith("/data/")))
  for (const elem of keysToDelete) {
    await deleteKV(elem)
  }

  for (const key of keys) {
    await setKV(key, data[key])
  }

  return new Response(null, {status: 204})
}

async function handleRequest(request) {
  let path = new URL(request.url).pathname
  if (request.method === "POST" && path === "/upload") {
    return uploadAsset(request)
  }

  // Data storage
  if ((request.method === "POST" || request.method === "DELETE") && path.startsWith("/data/")) {
    if (request.headers.get("Authorization") !== DATA_TOKEN) {
      return new Response("Forbidden", {status: 403})
    }

    if (request.method === "POST") { await setKV(path, request.body) }
    if (request.method === "DELETE") { await deleteKV(path) }
    return new Response(null, {status: 204})
  }

  if (request.method !== "GET") {
    return new Response("Method not allowed", {status: 405})
  }

  // Special case for the root url
  if (path === "/") {
    path = "/index.html"
  }

  console.log(`Getting static at ${path}`)
  let data = await getKV(path)
  if (!data) {
    return new Response('Not found', {status: 404})
  }

  return new Response(data, {
    headers: { 'content-type': mimetypes.lookup(path) || "text/plain" },
  })
}
