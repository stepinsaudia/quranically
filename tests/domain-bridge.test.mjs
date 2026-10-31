import test from "node:test";
import assert from "node:assert/strict";
import bridge from "../quranically-domain-bridge/dist/_worker.js";

test("Pages gateway fails closed until the original Worker is bound", async () => {
  const r = await bridge.fetch(new Request("https://quranically.businessinsaudi.com/tibb"), {});
  assert.equal(r.status, 503);
  assert.match(await r.text(), /service binding/i);
  assert.equal(r.headers.get("cache-control"), "no-store");
});

test("Pages gateway forwards canonical host, path, query, cookies, method, and body unchanged", async () => {
  let captured;
  const origin = {fetch: async req => {
    captured = req;
    return new Response("original-Worker-response", {status: 200, headers: {"content-type":"text/plain"}});
  }};
  const source = new Request("https://quranically.businessinsaudi.com/api/encyclopedia/answer?q=Hijrah&domain=seerah", {
    method: "POST", headers: {
      "content-type":"application/json",
      "origin":"https://quranically.businessinsaudi.com",
      "cookie":"__Host-qst_admin=masked-cookie"
    }, body: JSON.stringify({question:"Hijrah"})
  });
  const result = await bridge.fetch(source, {QURANICALLY_ORIGIN:origin});
  assert.equal(result.status,200);
  assert.equal(await result.text(),"original-Worker-response");
  assert.equal(captured,source);
  assert.equal(new URL(captured.url).hostname,"quranically.businessinsaudi.com");
  assert.equal(captured.headers.get("cookie"),"__Host-qst_admin=masked-cookie");
  assert.equal(captured.headers.get("origin"),"https://quranically.businessinsaudi.com");
  assert.deepEqual(await captured.json(),{question:"Hijrah"});
});

test("Pages gateway does not create a second Quranically data source", async()=>{
  let calls=0;
  const origin={fetch:async request=>{calls++;return new Response("ok:"+new URL(request.url).pathname)}};
  const paths=["/","/study.html","/tibb","/tibb?entry=black-seed","/api/health","/admin"];
  for(const path of paths){
    const req=new Request("https://quranically.businessinsaudi.com"+path);
    const resp=await bridge.fetch(req,{QURANICALLY_ORIGIN:origin});
    assert.equal(resp.status,200);
    assert.equal(await resp.text(),"ok:"+new URL(req.url).pathname);
  }
  assert.equal(calls,paths.length);
});
