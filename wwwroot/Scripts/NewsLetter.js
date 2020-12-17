$(function () {
    $("#NewsletterSubscriperBtn").click(function () {
        $("#NewsletterSubscriperBtn").attr("disabled", "disabled");
        $.ajax({
            type: "POST",
            url: "/Home/News_Letter_Subscribe",
            data: { Email: $('#txt_Email').val() },
            dataType: "text",
            success: function (msg) {
                alert(msg);
                $("#NewsletterSubscriperBtn").removeAttr("disabled");
                $('#txt_Email').val("");
            },
            error: function (req, status, error) {
                console.log(msg);
                $("#NewsletterSubscriperBtn").removeAttr("disabled");
            }
        });	
    });
});