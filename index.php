<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Document</title>
    <link href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-1q8mTJOASx8j1Au+a5WDVnPi2lkFfwwEAa8hDDdjZlpLegxhjVME1fgjWPGmkzs7" crossorigin="anonymous">

    <style>
        .meta h2, .meta h3 {
            color: #555;
        }
        body h1 {color: #555;}
    </style>
</head>
<body>

    <div class="container">
        <div class="row no-connection" style="display:none;">
            <div class="col-md-12 server-offline">
                <br>
                <div class="alert alert-warning ">
                    <strong>Attenzione!</strong> Il server è offline in questo momento.
                </div>
            </div>
        </div>

        <div class="row no-data" style="display:none;">
            <div class="col-md-6 col-md-offset-3 " >
                <div class="">
                    <h4 style="text-align: center;">In attesa dei dati da parte del server</h4>
                    <img src="assets/img/gears.gif" style="width:100%; padding:0 30%" alt="">
                </div>
            </div>
        </div>
    </div>

    <div class="connection" style="display: none;">
        <div class="container meta">

            <div class="row">&nbsp</div>
            <div class="row">
                <div class="col-md-4">
                    <img src="#" class="album-art" style="width:100%;" alt="">
                </div>
                <div class="col-md-6">
                    <h1><span class="title"></span></h1>
                    <h3 style="font-style:italic;">
                        <strong>Artista: </strong><span class="artist"></span>
                        <h3><strong>Album: </strong> <span class="album"></span></h3>
                        <br>
                        <p class="genre"></p>
                </div>
                <div class="col-md-2">
                <span class="pull-right panel panel-default" style="border: solid 1px #bbb;">
                    <div class="panel-body" >
                         <h2 style="margin-top:10%; margin-bottom:10%; color:#777; font-style: italic;">Utenti: <span class="listeners "></span></h2>
                    </div>
                </span>
                </div>
            </div>
            <br>
            <div class="row">

                <div class="col-md-12">
                    <canvas id="myChart" style="width:100%; max-height:200px;"></canvas>
                </div>
            </div>
        </div>
        <div class="container">
            <div class="row">
                <div class="col-md-12 ">
                    <h3>Utimi brani Trasmessi</h3>
                    <table class="table">
                        <thead class="thead-inverse">
                        <tr>
                            <th>Titolo</th>
                            <th>Inizio</th>
                            <th>Fine</th>
                            <th>Picco listener</th>
                            <th>Media listener</th>
                        </tr>
                        </thead>
                        <tbody class="history">
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

</body>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/2.2.4/jquery.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/1.4.6/socket.io.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.1.4/Chart.js"></script>
<script>

(function($){

    $(document).on('datareceived', function (e, data) {

        $('.no-connection').hide();
        $('.no-data').hide();
        $('.connection').show();

    });

    Chart.defaults.global.legend.display = false;
    var listeners = 0;
    var dominantColor = {r: 53, g: 101, b: 131 };

    var socket = io.connect( 'http://localhost:3000' );


    socket.on('connect_error',function(){

        $('.connection').hide();
        $('.no-data').hide();
        $('.no-connection').show();

    });

    socket.on('connect',function(){

        $('.connection').hide();
        $('.no-connection').hide();
        $('.no-data').show();

        socket.emit('join_room', '1');

    });

    socket.on('feed-on',function(){

        $('.connection').hide();
        $('.no-connection').hide();
        $('.no-data').show();

    });

    socket.on('meta', function(data){

        $.event.trigger('datareceived');

        var results = data[0];
        var cover = results.album_art_url != '' ? results.album_art_url : results.artist_image_url;

        $('.album-art').attr('src', cover);
        $('.album').html(results.album_title+' - '+results.album_year);
        $('.artist').html(results.tracks[0].track_artist_name);
        $('.title').html(results.tracks[0].track_title);

        $('.genre').html('');
        for(var genre in results.genre){
            $('.genre').append('<span class="btn btn-default btn-small" style="margin-bottom:1%;">#'+results.genre[genre].text+'</span>&nbsp;');
        }

    });

    socket.on('listeners', function(data){

        $.event.trigger('datareceived');

        listeners = data;
        $(".listeners").fadeOut(0, function() {
            $(this).text(data)
        }).fadeIn('1000');

    });

    socket.on('history', function(data){

        $.event.trigger('data-received');

        var history = $('.history');
        var template = '';
        console.log('history', data);

        $.each( data, function (index, value) {

            if(index>0) {

                template += ''+
                    '<tr>'+
                    '<td>'+value.meta[0].tracks[0].track_title+'</td>'+
                    '<td>'+isoToHumanDate(value.start)+'</td>'+
                    '<td>'+isoToHumanDate(value.end)+'</td>'+
                    '<td><strong>'+value.peak.quantity+'</strong> ('+isoToHumanDate(value.peak.date)+')'+'</td>'+
                    '<td></td>'+
                    '</tr>'
                ;

            }
        });

        history.html('');
        history.append(template);

    });

    socket.on('disconnected', function(data){

        $('.connection').hide();
        $('.no-data').hide();
        $('.no-connection').show();

    });

    socket.on('mount.disconnected', function(data){

        $('.connection').hide();
        $('.no-data').show();
        $('.no-connection').hide();

    });

    function isoToHumanDate (date){

        date = new Date(date);

        var data = ''+
            date.getDate()+
            '-'+
            (date.getMonth()+1)+
            '-'+date.getFullYear()
        ;

        TodayDate = new Date();

        if (TodayDate.toDateString() == date.toDateString()) {
            data = 'Oggi '
        }

        var humanDate =
            data+' '+
            date.getHours()+':'+
            date.getMinutes()+':'+
            date.getSeconds()
        ;

        return humanDate;

    }

    var graphSize = 360;

    // GRAPH
    var emptyArr = new Array(graphSize).fill(0);

    var ctx = document.getElementById("myChart");
    var myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels : emptyArr,
            datasets: [{
                data: emptyArr,
                backgroundColor: [
                    'rgba('+dominantColor.r+','+dominantColor.g+','+dominantColor.b+', 0.6)'
                ],
                borderColor: [
                    'rgba('+dominantColor.r+','+dominantColor.g+','+dominantColor.b+', 1)'
                ],

                lineTension : 0

            }]
        },
        options: {
            scales: {
                xAxes: [{
                    ticks: {
                        min: 0,
                        beginAtZero: true,
                        display: false
                    }
                }],
                yAxes: [{
                    ticks: {
                        min: 0,
                        max : 6,
                        beginAtZero: true
//                        display: false
                    }
                }]
            },
//            segmentShowStroke: false,
//            percentageInnerCutout: 75,
            animation: false
        }
    });

    var updatechart = function(value){

        var data = myChart.data.datasets[0].data;
        var labels = myChart.data.labels;
        var scaleMax = myChart.options.scales.yAxes.max;

        if ( data.length >= 30){
            data.shift();
            labels.shift();
        }

//        labels.push('');
        data.push(value);
        scaleMax = value+1;

        myChart.update();

    };


    setInterval(function(){

        updatechart(listeners);

    }, 1000)

})(jQuery);





</script>

</html>