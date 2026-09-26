---
id: L01
---
# Answers: How Express handles a request

## Before you start

1. The first one defined, because Express matches handlers in the order they were added. Source: [Express guide: Routing](https://expressjs.com/en/guide/routing.html)
2. An error response, a 500 by default, because Express's default error handler catches synchronous throws. Source: [Express guide: Using middleware](https://expressjs.com/en/guide/using-middleware.html)

## Retrieval practice

1. The request is matched against each handler's method and path in order; the first match runs and calls a response method, which ends the exchange. Source: [Core idea](#core-idea)
2. The first matching handler in definition order, because matching is top to bottom. Source: [Core idea](#core-idea)
3. From the matched URL segment named `:id` in the route path. Source: [Express guide: Routing](https://expressjs.com/en/guide/routing.html)
4. A 404 with a plain-text body from the default final handler. Source: [Express guide: Using middleware](https://expressjs.com/en/guide/using-middleware.html)
5. Because the response is only sent when a response method is called; nothing ends the request otherwise. Source: [Core idea](#core-idea)
