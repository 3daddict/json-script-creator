<script>
  export let type;
  export let caption;
  export let href;
  export let mode;
</script>

<style>
  
</style>

{#if href}
  <a class="waves-effect waves-teal btn-flat" {href}>{caption}</a>
{:else}
  <button class="{mode} btn-floating btn-large waves-effect waves-light red" {href} {type}><i class="material-icons">{caption}</i></button>
{/if}
