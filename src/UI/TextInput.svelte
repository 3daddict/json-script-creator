<script>
  export let controlType;
  export let id;
  export let label;
  export let rows;
  export let value;
  export let type;
</script>

<style>

</style>

<div class="form-control">
  <label for={id}>{label}</label>
  {#if controlType === 'textarea'}
    <textarea {rows} {id} {value} on:input />
  {:else}
    <input type="{type}" {id} {value} on:input />
  {/if}
</div>
