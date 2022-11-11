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