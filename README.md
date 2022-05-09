[![Svelte v3](https://img.shields.io/badge/svelte-v3-orange.svg)](https://svelte.dev)

# svelte-wsocket

A simple websocket wrapper for svelte

## Installation

```sh
npm install svelte-wsocket
```

## Wiki
Read [wiki](https://github.com/molimawka/svelte-wsocket/wiki) and **[warning](https://github.com/molimawka/svelte-wsocket/wiki/WSocket#warning)** before creating issue :)

## Usage

### Example 1

```svelte
<script>
  import WSocket from 'svelte-wsocket';
  const wsocket = new WSocket("wss://example.com/")
  // get state store
  const wsState = wsocket.getState()
  // get store for "open" event
  const onOpen = wsocket.on("open")
  // get store for "testEvent" event
  const testEvent = wsocket.on("testEvent")
  // check/wait open connect and call connected function
  $: $onOpen && connected()

  function connected() {
    // After open send object
    // Send json: {event: "testEvent", data: { score: 0 }}
    $testEvent = {score: 0}
  }
</script>
<div>
  <p>WebSocket state: {$wsState}</p>
  <p>Open: {$onOpen}</p>
  <p>Last test event data: {JSON.stringify($testEvent)}</p>
</div>
```

### Example 2
<sub>It is not recommended to do this, but it is possible)</sub>
```svelte
<script>
  import { onDestroy } from 'svelte';
  import WSocket from 'svelte-wsocket';

	const wsocket = new WSocket("wss://example.com/")
  const testEvent = wsocket.on("testEvent")
  const unsubTestEvent = testEvent.subscribe((data) => {
    console.log("Receive testEvent")
    console.log("Data", data)
  })
  const openEvent = wsocket.on("open")
  const unsubOpenEvent = openEvent.subscribe((data) => {
    console.log("WebSocket opened!")
    wsocket.send("testEvent", {name: "Robert", age: 23})
  })

  onDestroy(() => {
    unsubTestEvent()
    unsubOpenEvent()
  })
</script>
```
