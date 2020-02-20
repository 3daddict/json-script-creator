<script>
	import CardGrid from './components/CardGrid.svelte';
	import Card from './UI/Card.svelte';
	import TextInput from "./UI/TextInput.svelte";
	import Button from './UI/Button.svelte';

	let cardTitle = "";
    let carrierCode = "";
    let delay = "";
    let delayEnd = "";
    let dateShow = "";
	let dateHide = "";
	
	let cards = [
		{
			id: "c1",
			cardTitle: "UPS",
			carrierCode: "gnd",
			delay: null,
			delayEnd: null,
			dateShow: null,
			dateHide: null
		},
		{
			id: "c2",
			cardTitle: "UPS",
			carrierCode: "Express",
			delay: null,
			delayEnd: null,
			dateShow: null,
			dateHide: null
		}
	]

	function addCard() {
		console.log("Triggered!")
    const newCard = {
      id: Math.random().toString(),
      cardTitle,
      carrierCode,
      delay,
      delayEnd,
      dateShow,
      dateHide
    };

    cards = [newCard, ...cards];
  }
</script>

<main>
	<form on:submit|preventDefault={addCard}>
    <TextInput
      id="cardTitle"
      label="Title"
      type="text"
      value={cardTitle}
      on:input={event => (cardTitle = event.target.value)} />
    <TextInput
      id="carrierCode"
      label="carrierCode"
      type="text"
      value={carrierCode}
      on:input={event => (carrierCode = event.target.value)} />
    <TextInput
      id="delay"
      label="delay"
      type="text"
      value={delay}
      on:input={event => (delay = event.target.value)} />
    <TextInput
      id="delayEnd"
      label="delayEnd URL"
      type="text"
      value={delayEnd}
      on:input={event => (delayEnd = event.target.value)} />
    <TextInput
      id="dateShow"
      label="dateShow"
      type="text"
      value={dateShow}
      on:input={event => (dateShow = event.target.value)} />
    <TextInput
      id="dateHide"
      label="dateHide"
      type="text"
      value={dateHide}
      on:input={event => (dateHide = event.target.value)} />
		<Button type="submit" caption="+" />
  </form>
  <div class="row">
  	<CardGrid {cards} />
  </div>
</main>

<style>
	
</style>