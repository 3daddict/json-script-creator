<script>
  import Card from "../UI/Card.svelte";

  export let cards;
</script>

<style>

</style>

<section class="section">
{#each cards as card}
  <Card 
    cardTitle={card.cardTitle}
    carrierCode={card.carrierCode}
    delay={card.delay}
    delayEnd={card.delayEnd}
    dateShow={card.dateShow}
    dateHide={card.dateHide}
  />
  {/each}
</section>
