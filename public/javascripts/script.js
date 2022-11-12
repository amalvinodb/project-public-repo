function addToCart(prodId){
    
    $.ajax({
        url:"/user/addToCart/"+prodId,
        method:'get',
        success:(response)=>{
            if(response.status){
                Toastify({
                    text: "PRODUCT ADDED TO CART",
                    duration: 3000,
                
                    newWindow: true,
                    close: true,
                    gravity: "top", // `top` or `bottom`
                    position: "center", // `left`, `center` or `right`
                    stopOnFocus: true, // Prevents dismissing of toast on hover
                    style: {
                      background: "linear-gradient(to right, #00b09b, #96c93d)",
                    },
                    onClick: function(){} // Callback after click
                  }).showToast();
                let count = $('#cartCount').html()
                count = parseInt(count) + 1
                $('#cartCount').html(count)
                
            }else{
                $('#loginmodal').modal('show')
            }
            
            
        }
    })
}

function addToWishlist(prodId){
    
    $.ajax({
        url:"/user/addToWishlist?prod="+prodId,
        method:'get',
        
        success:(respoce)=>{
            if(respoce.status){
                Toastify({
                    text: "PRODUCT ADDED TO WISHLIST",
                    duration: 3000,
                    newWindow: true,
                    close: true,
                    gravity: "top", // `top` or `bottom`
                    position: "center", // `left`, `center` or `right`
                    stopOnFocus: true, // Prevents dismissing of toast on hover
                    style: {
                      background: "linear-gradient(to right, #00b09b, #96c93d)",
                    },
                    onClick: function(){} // Callback after click
                  }).showToast();
            }else{
                $('#loginmodal').modal('show')
            }
            
        }
    })
}
$(document).ready(function () {
    $(".block__pic").imagezoomsl({
        zoomrange: [3, 3]
    });
});

function searching(){
    let data = document.getElementById('search').value
    location.href = '/searchProduct?data='+data
}
function editaddress(event,id){
    event.preventDefault()
    $.ajax({
        url:'/user/getAddressDetails',
        method:'post',
        data:{
            addressId:id
        },
        success:(responce)=>{
          
            document.getElementById('editAddresNow').innerHTML = `<div class="" id="" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="">
            <div class="modal-dialog">
              <div class="modal-content">
                <div class="modal-header">
                  <h1 class="modal-title fs-5" id="exampleModalLabel">edit address</h1>
                  
                </div>
                <div class="modal-body">
    
                  <div class="d-fle">
                    <div>
                      <div class="col-md-12 mb-1">
                        <div class="form-outline">
                          <input name="userName" type="text" id="userName" class="form-control form-control-lg"
                            value="${responce.address.userName}" required />
                          <label class="form-label" for="firstName">user Name</label>
                        </div>
                      </div>
                      <div class="col-md-12 mb-1">
                        <div class="form-outline">
                          <input name="phnumber" type="" id="phnumber" class="form-control form-control-lg"
                            value="${responce.address.phnumber}" required />
                          <label class="form-label" for="firstName">phone number</label>
                        </div>
                      </div>
                      <div class="col-md-12 mb-1">
                        <div class="form-outline">
                          <input name="pin" type="" id="pin" class="form-control form-control-lg" value="${responce.address.pin}"
                            required />
                          <label class="form-label" for="firstName">pincode</label>
                        </div>
                      </div>
                      <div class="col-md-12 mb-1">
                        <div class="form-outline">
                          <input name="hname" type="" id="hname" class="form-control form-control-lg" value="${responce.address.hname}"
                            required />
                          <label class="form-label" for="firstName">flat No, house name,building,company,apartment</label>
                        </div>
                      </div>
                      <div class="col-md-12 mb-1">
                        <div class="form-outline">
                          <input name="region" type="" id="region" class="form-control form-control-lg"
                            value="${responce.address.region}" required />
                          <label class="form-label" for="firstName">area, street,sector,village</label>
                        </div>
                      </div>
                      <div class="col-md-12 mb-1">
                        <div class="form-outline">
                          <input name="lmk" type="" id="lmk" class="form-control form-control-lg" value="${responce.address.lmk}"
                            required />
                          <label class="form-label" for="firstName">land mark</label>
                        </div>
                      </div>
    
                      <div class="row">
                        <div class="col-md-6 mb-4">
                          <div class="form-outline">
                            <input name="town" type="text" id="town" class="form-control form-control-lg"
                              value="${responce.address.town}" required />
                            <label class="form-label" for="firstName">town or city</label>
                          </div>
                        </div>
                        <div class="col-md-6 mb-4">
                          <div class="form-outline">
                            <input name="state" type="text" id="state" class="form-control form-control-lg"
                              value="${responce.address.state}" required />
                            <label class="form-label" for="offerPrice">state</label>
                          </div>
                        </div>
                      </div>
                    </div>
    
                  </div>
    
                </div>
                <div class="modal-footer">
                
                  <button class="btn btn-primary" onclick="editAddress(event,'${responce.address._id}')">add address</button>
                </div>
              </div>
            </div>
          </div>
         
        </div>`
         
        }
    })
}