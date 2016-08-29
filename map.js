(function(){
    var appMap;
    var colors = ['blue', 'red', 'darkOrange', 'night', 'darkBlue', 'pink', 'brown', 'darkGreen', 'violet', 'black', 'yellow', 'green', 'orange', 'lightBlue', 'olive'];
    var mixedColor = 'gray';
    var enabledGroups = [];
    var manager = null;

    function addMap(){
        appMap = new ymaps.Map("map", {
            center: [55.76, 37.64],
            zoom: 10,
            controls: []
        });
        appMap.controls.add('typeSelector', {float: 'right'});
        appMap.controls.add('geolocationControl', {float: 'right'});
        appMap.controls.add('zoomControl');
        appMap.controls.add('rulerControl');
        window.appMap = appMap;
    }
    function createScope(index, places){
        var color = colors[index % colors.length];

        scope = _.map(places, function(place){
            return {
                type: "Feature",
                id: index+'_'+place.id,
                geometry: {
                    type: "Point",
                    coordinates: [place.lat, place.long]
                },
                properties: {
                    group: index+1,
                    balloonContentHeader: 'Волна: '+(index+1)+', Объект: '+place.id,
                    balloonContentBody: place.address+'<br><strong>Найден по адресу: </strong>'+place.found,
                    balloonContentFooter: '<button class="jsPano" data-lat='+place.lat+' data-long='+place.long+'>Панорама</button>',
                    iconCaption: '№ '+place.id,
                    clusterCaption: 'Волна: '+(index+1)+', № '+place.id
                },
                options: {
                    preset: "islands#"+color+"DotIcon"
                }
            }
        });

        return scope;
    }
    function createManager(places){
        var objectManager = new ymaps.ObjectManager({clusterize: true});

        objectManager.add(places);

        objectManager.clusters.events.add('add', function (e) {
            var cluster = objectManager.clusters.getById(e.get('objectId')),
                objects = cluster.properties.geoObjects,
                color   = null;

            var groups = _.uniq(_.map(objects, function(o){return o.properties.group}));
            if (groups.length > 1){
                color = mixedColor;
            } else if(groups.length == 1 && colors[groups[0]-1]){
                color = colors[groups[0]-1];
            }

            if (color) {
                objectManager.clusters.setClusterOptions(e.get('objectId'), {
                    preset: 'islands#'+color+'ClusterIcons'
                });
            }
        });

        appMap.geoObjects.add(objectManager);
        manager = objectManager;

        return objectManager;
    }
    function createFilter(groups){
        var list = new ymaps.control.ListBox({
            data: {
                content: 'Фильтр'
            }
        });

        _.each(groups, function(group){
            var item = new ymaps.control.ListBoxItem('Волна '+group);
            item.select();
            item.events.add('select', function(){
                enabledGroups.push(group);
                manager.setFilter(function(place){
                    return filter(place.properties.group);
                });
            });
            item.events.add('deselect', function(){
                enabledGroups = _.without(enabledGroups, group);
                manager.setFilter(function(place){
                    return filter(place.properties.group);
                });
            });
            list.add(item);
        });

        enabledGroups = groups;
        appMap.controls.add(list, {float: 'right'});
    }
    function filter(group){
        return _.contains(enabledGroups, group);
    }

    ymaps.ready(function(){
        addMap();

        $.when(
            $.getJSON('./data/1_ready.json'),
            $.getJSON('./data/2_ready.json')
        ).then(function(){
            var dataSets = Array.prototype.slice.call(arguments, 0);
            var objects = [];
            var groups = []

            for(var i=0; i<dataSets.length; i++){
                objects.push(createScope(i, dataSets[i][0].places));
                groups.push(i+1);
            }
            createFilter(groups);

            return _.flatten(objects);
        }).then(function(places){
            createManager(places);
        });

        $(document).on('click', '.jsPano', function(e){
            if($('#pano').length == 0){
                $('body').append('<div id="pano"></div>');
            }
            var coordinates = [$(this).data('lat'), $(this).data('long')];
            ymaps.panorama.createPlayer('pano', coordinates).then(function(player){
                player.lookAt(coordinates);
                player.events.add('destroy', function(){
                    $('#pano').remove();
                })
            })
        });
    });
})();
