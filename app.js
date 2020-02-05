document.addEventListener("DOMContentLoaded", function () {
    // Handler when the DOM is fully loaded
    console.log('AppLoaded!');

    //Click Handlers
    document.getElementById('getJson').addEventListener('click', createCards);
});

let jsonObject = [];

function createCards(){
    fetch('./test.json')
    .then((res) => res.json())
    .then((data) => {
      let output = '<h2>JSON DATA</h2>';
      data.forEach(function(map){
        map.shipping_map.forEach(function(carrier) {
            carrier.shipping_methods.forEach(function(method) {
                output += `
                    <div class="col s12 m6">
                        <div class="card">
                            <div class="card-content">
                            <span class="card-title">${carrier.carrier.toUpperCase()}</span>
                            <h5>${method.shopify_title}</h5>
                            <ul>
                                <li class="list-group-item">Carrier Code: ${method.carrier_code}</li>
                                <li class="list-group-item">Delay: ${method.delay}</li>
                                <li class="list-group-item">Delay End: ${method.delay_end}</li>
                                <li class="list-group-item">Delay Show: ${method.date_show}</li>
                                <li class="list-group-item">Delay Hide: ${method.date_hide}</li>
                            </ul>
                            </div>
                            <div class="card-action">
                            <a href="#">Edit</a>
                            <a href="#">Delete</a>
                            </div>
                        </div>
                    </div>
            `;
            })
        })
        jsonObject = data;
        
      });
      document.getElementById('output').innerHTML = output;
      document.getElementById('jsonSchema').value = JSON.stringify(jsonObject);
      console.log(jsonObject)
    })
  }

 