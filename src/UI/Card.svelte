<script>
    export let cardTitle;
    export let carrierCode;
    export let delay;
    export let delayEnd;
    export let dateShow;
    export let dateHide;
</script>


    <div class="col s12 m6">
        <div class="card">
            <div class="card-content">
                <span class="card-title">{cardTitle}</span>
                <ul>
                    <li class="list-group-item">Carrier Code: {carrierCode}</li>
                    <li class="list-group-item">Delay: {delay}</li>
                    <li class="list-group-item">Delay End: {delayEnd}</li>
                    <li class="list-group-item">Delay Show: {dateShow}</li>
                    <li class="list-group-item">Delay Hide: {dateHide}</li>
                </ul>
            </div>
            <div class="card-action">
                <a href="/edit">Edit</a>
                <a href="/delete">Delete</a>
            </div>
        </div>
    </div>
