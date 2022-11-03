function addToCart(prodId){
    
    $.ajax({
        url:"/user/addToCart/"+prodId,
        method:'get',
        success:(response)=>{
            if(response.status){
                alert('added')
                let count = $('#cartCount').html()
                count = parseInt(count) + 1
                $('#cartCount').html(count)
                
            }else{
                location.href = '/user/login'
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
                alert('product have been added')
            }else{
                location.href = '/user/login'
            }
            
        }
    })
}
$(document).ready(function () {
    $(".block__pic").imagezoomsl({
        zoomrange: [3, 3]
    });
});