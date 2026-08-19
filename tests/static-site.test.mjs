import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("a página tem identidade, campos essenciais e aviso de segurança", async () => {
  const html = await read("index.html");
  assert.match(html, /Rafão Calculadora de Peptídeos/);
  for (const id of ["vialMg", "vialCount", "waterMl", "doseValue", "doseUnit", "frequencyMode", "frequencyValue"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /não recomenda dose, frequência ou tratamento/i);
  assert.match(html, /type="module" src="\.\/app\.mjs"/);
});

test("o manifesto e o service worker usam caminhos relativos ao projeto", async () => {
  const html = await read("index.html");
  const manifest = JSON.parse(await read("manifest.webmanifest"));
  const worker = await read("sw.js");

  assert.match(html, /href="\.\/manifest\.webmanifest"/);
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  assert.ok(manifest.icons.every((icon) => icon.src.startsWith("./")));
  assert.match(worker, /self\.registration\.scope/);
  assert.doesNotMatch(worker, /https:\/\//);
});

test("o compartilhamento usa a URL atual e tem alternativa por WhatsApp", async () => {
  const app = await read("app.mjs");
  assert.match(app, /navigator\.share/);
  assert.match(app, /wa\.me\/\?text=/);
  assert.match(app, /window\.location\.href/);
});

test("o workflow publica o conteúdo estático no GitHub Pages", async () => {
  const workflow = await read(".github/workflows/pages.yml");
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(workflow, /enablement: true/);
  assert.match(workflow, /path: \./);
  assert.match(workflow, /pages: write/);
});
