import { describe, expect, it } from "vitest";
import { BooksGateway } from "./BooksGateway";
import { FakeHttpClient } from "../../test/fakes/FakeHttpClient";

describe("BooksGateway", () => {
  it("builds the correct URL for getAll", async () => {
    const http = new FakeHttpClient();
    http.respondWith([]);
    const gateway = new BooksGateway(http);

    await gateway.getAll("opedchenko");

    expect(http.lastCall).toMatchObject({ method: "GET", path: "/v1/books/opedchenko/" });
  });

  it("builds the correct URL for getPrivate", async () => {
    const http = new FakeHttpClient();
    http.respondWith([]);
    const gateway = new BooksGateway(http);

    await gateway.getPrivate("opedchenko");

    expect(http.lastCall).toMatchObject({
      method: "GET",
      path: "/v1/books/opedchenko/private",
    });
  });

  it("url-encodes the user id", async () => {
    const http = new FakeHttpClient();
    http.respondWith([]);
    const gateway = new BooksGateway(http);

    await gateway.getAll("a user/with slash");

    expect(http.lastCall?.path).toBe("/v1/books/a%20user%2Fwith%20slash/");
  });

  it("posts the payload to the correct URL for create", async () => {
    const http = new FakeHttpClient();
    http.respondWith({ status: "ok" });
    const gateway = new BooksGateway(http);

    await gateway.create("opedchenko", { name: "Dune", author: "Frank Herbert" });

    expect(http.lastCall).toMatchObject({
      method: "POST",
      path: "/v1/books/opedchenko/",
      body: { name: "Dune", author: "Frank Herbert" },
    });
  });

  it("forwards the abort signal on every call", async () => {
    const http = new FakeHttpClient();
    http.respondWith([]);
    const gateway = new BooksGateway(http);
    const controller = new AbortController();

    await gateway.getAll("opedchenko", controller.signal);
    expect(http.lastCall?.signal).toBe(controller.signal);

    await gateway.getPrivate("opedchenko", controller.signal);
    expect(http.lastCall?.signal).toBe(controller.signal);

    await gateway.create("opedchenko", { name: "Dune", author: "Frank Herbert" }, controller.signal);
    expect(http.lastCall?.signal).toBe(controller.signal);
  });

  it("returns the response body as-is", async () => {
    const http = new FakeHttpClient();
    const payload = [{ id: 1, name: "Dune", author: "Frank Herbert" }];
    http.respondWith(payload);
    const gateway = new BooksGateway(http);

    const result = await gateway.getAll("opedchenko");

    expect(result).toBe(payload);
  });
});
