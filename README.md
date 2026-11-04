# Sign me up · CRAPP build

The CRUD build of Sign me up, made for comparison with `sign-me-up-eve` (event sourced) and `sign-me-up-evl` (event modeled, table storage).

It is built the everyday way: from the idea alone, with no event model, no plan and no Given/When/Then. Its only input was this prompt:

> Build me a sign-up sheet app called "Sign me up". Sheets with a limited number of spots: a pottery class, a carpool, the crayfish party table. Someone makes a sheet, people put their name down, and when it's full they join a waitlist. Cancel and the first person waiting moves up.

Round 2 gives all three builds the same new requests.

## How to run

```sh
python3 -m http.server -d app 8000   # then open http://localhost:8000
# or: npx serve app
node --test                          # run the tests (Node 18+)
```

Data lives in the browser's localStorage (key `sign-me-up`). Logic is in `app/sheets.js` (no DOM), the UI in `app/main.js`.
