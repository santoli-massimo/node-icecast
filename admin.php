<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Document</title>
    <link href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-1q8mTJOASx8j1Au+a5WDVnPi2lkFfwwEAa8hDDdjZlpLegxhjVME1fgjWPGmkzs7" crossorigin="anonymous">
</head>
<body>

<div class="container-fluid">
    <div class="row">
        <button class="btn btn-success start">Avvia</button>
        <button class="btn btn-danger stop">Ferma</button>
    </div>

</div>

</body>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/2.2.4/jquery.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/1.4.6/socket.io.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.1.4/Chart.js"></script>

<script>
    
    (function($){

        $('.start').on('click', function(){

            var self = this;

            if( !$(self).hasClass('disabled') ){
                $(self).addClass('disabled');

                $.ajax({
                        url :'http://127.0.0.1:3001/icecast/1/start/',
                        dataType: 'text',
                        data: {
                            host: "127.0.0.1",
                            port: 8000,
                            user: 'santoli.massimo@gmail.com',
                            password: 'TIF2whp3',
                            xml : "/etc/icecast2/topixradio/1/1.xml",
                            id : 1
                        }
                    })
                    .done(function(res){
                        console.log(res);
                        $(self).removeClass('disabled');
                    })
                    .error(function(res){ console.log(res)})
                ;

                $.ajax({
                        url :'http://127.0.0.1:3001/icecast/2/start/',
                        dataType: 'text',
                        data: {
                            host: "127.0.0.1",
                            port: 8001,
                            user: 'santoli.massimo@gmail.com',
                            password: 'TIF2whp3',
                            xml : "/etc/icecast2/topixradio/2/2.xml",
                            id: 2
                        }
                    })
                    .done(function(res){
                        console.log(res);
                        $(self).removeClass('disabled');
                    })
                    .error(function(res){ console.log(res)})
                ;

            }

        });

        $('.stop').on('click', function(){

            var self = this;

            if( !$(self).hasClass('disabled') ) {

                $(self).addClass('disabled');

                $.ajax({
                        url: 'http://127.0.0.1:3001/icecast/1/stop/',
                        dataType: 'text'
                    })
                    .done(function (res) {
                        console.log(res);
                        $(self).removeClass('disabled');
                    })
                    .error(function (res) {
                        console.log(res);
                    });
                ;
            }

        });

    })(jQuery);

</script>

</html>