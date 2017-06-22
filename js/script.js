var app;
$(document).ready(function() {

  app = {
    center: {
      lat: -41.16149186921309,
      lng: 171.93083095625002
    },
    zoom: [6, 14, 18],
    locations: [],
    directionsDisplay: null,
    directionService: null,
    directionsInfo: null,
    userpos: null,
    godirections: false,
    markers: [],
    travelMethods: ["DRIVING", "WALKING", "BICYCLING", "TRANSIT"],
    location: function(i, is_func) {
      if (is_func) {
        app.tmp__location = this.locations[i].location;
        var r = {
          lat: function() {
            return app.tmp__location[0];
          },
          lng: function() {
            return app.tmp__location[1];
          }
        }
      } else {
        var r = {
          lat: this.locations[i].location[0],
          lng: this.locations[i].location[1]
        }
      }
      return r;
    },
    info: function(e_id) {
      var el;
      if (!isNaN(e_id)) el = app.markers[e_id];
      else el = this;
      app.infobox.setContent((Template7.compile($('#infoboxTemplate').html()))(app.locations[el.kmid]));
      $('#stores > .store.is-active').removeClass('is-active');
      $('#stores > .store[data-id="' + el.kmid + '"]').addClass('is-active');
      if ($(window).width() <= 767) $('#stores').collapse('hide');
      app.map.panTo(el.position);
      app.map.setZoom(app.zoom[1]);
      app.infobox.open(app.map, el);
      app.directionsbox.close();
      app.active = el;
    },
    getDistances: function() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          function(pos) {
            var closestDistance = false;
            app.tmp__pos = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            };
            if (app.userpos) {
              app.tmp__pos = app.userpos;
            } else {
              var marker = new google.maps.Marker({
                position: {
                  lat: app.tmp__pos.lat,
                  lng: app.tmp__pos.lng
                },
                map: app.map,
                icon: "img/geolocation.png",
                kmid: 'user',
                draggable: true
              });
              marker.addListener('dragend', function() {
                app.userpos.lat = this.position.lat();
                app.userpos.lng = this.position.lng();
                app.infobox.close();
                app.directionsbox.close();
                app.getDistances();
                if (app.godirections) app.directions(app.godirections.kmid, app.godirections.data.travelMode);
              });
            }
            for (var i = 0; i < app.markers.length; i++) {
              var distance = google.maps.geometry.spherical.computeDistanceBetween({
                  lat: function() {
                    return app.tmp__pos.lat;
                  },
                  lng: function() {
                    return app.tmp__pos.lng;
                  }
                },
                app.location(i, true)
              );
              var distance_text;
              if (distance < 1000) {
                distance_text = Math.round(distance);
                distance_text += 'm away';
              } else {
                distance_text = Number(Math.round(distance / 1000 + 'e2') + 'e-2');
                distance_text += 'km away';
              }
              app.locations[i].distance = distance;
              app.locations[i].distance_text = distance_text;
              $('#stores .store[data-id="' + i + '"] .store-distance').text(distance_text);
              if (distance < closestDistance || closestDistance === false) closestMarker = i, closestDistance = distance;
            }
            app.createItems();
            app.userpos = app.tmp__pos;
          },
          function() {
            app.closestDeny('DENIED');
          }
        );
      } else app.closestDeny('NOT_AVAILABLE');
    },
    closestDeny: function(reason) {},
    directions: function(kmid, travelMode) {
      app.infobox.close();
      app.directionsbox.close();
      if (!app.userpos) {
        app.directionsbox.setContent('<strong>Sorry, directions are currently unavailable.</strong><br />This may be due to geolocation not being available on your device or permission has been denied.');
        app.directionsbox.open(app.map, app.markers[kmid]);
        return;
      }
      if (!travelMode) {
        var methods = [];
        for (var i = 0; i < app.travelMethods.length; i++) {
          methods.push({
            method: app.travelMethods[i],
            id: kmid
          });
        }
        var data = {
          id: kmid,
          methods: methods
        };
        app.directionsbox.setContent((Template7.compile($('#transportTemplate').html()))(data));
        app.directionsbox.open(app.map, app.markers[kmid]);
        return;
      }
      if (app.directionsDisplay) app.directionsDisplay.setMap(null);
      app.directionService = new google.maps.DirectionsService();
      app.directionsDisplay = new google.maps.DirectionsRenderer();
      app.directionsDisplay.setMap(app.map);
      $('#map-wrap').removeClass('show-footer');
      app.godirections = {
        data: {
          origin: app.userpos,
          destination: app.location(kmid),
          travelMode: google.maps.TravelMode[travelMode]
        },
        kmid: kmid
      };
      app.directionService.route(
        app.godirections.data,
        function(response, status) {
          app.directionsInfo = response;
          if (status == 'OK') {
            app.directionsDisplay.setDirections(response);
            $('#map-wrap').addClass('show-footer');
            var data = response.routes[0];
            data._c = {};
            data._c.destination = response.request.destination;
            data._c.store = app.locations[app.godirections.kmid];
            data._c.step_allow = response.routes[0].legs[0].steps.length <= 25;
            $('#map-footer').html((Template7.compile($('#footerTemplate').html()))(data));
            var swiper = new Swiper('#map-footer .swiper-container', {
              pagination: '.swiper-pagination',
              paginationClickable: true,
              nextButton: '.swiper-button-next',
              prevButton: '.swiper-button-prev',
              onSlideChangeEnd: function() {
                var active_slide = $('#map-footer .swiper-container .swiper-slide-active');
                if (!active_slide.hasClass('footer-instruction')) {
                  return;
                }
                var active_location = active_slide.attr('data-location').split(',');
                app.map.panTo({
                  lat: Number(active_location[0]),
                  lng: Number(active_location[1])
                });
                app.map.setZoom(app.zoom[2]);
              },
              onInit: function() {
                $('#map-footer .swiper-button-close').click(function() {
                  if (app.directionsDisplay) app.directionsDisplay.setMap(null);
                  $('#map-wrap').removeClass('show-footer');
                  app.map.panTo(app.center);
                  app.map.setZoom(app.zoom[0]);
                });
              }
            });
          } else {
            app.godirections = false;
            app.directionsbox.setContent('<strong>Sorry, no directions available.</strong><br />No directions to this store are available using your selected transport method.');
            app.directionsbox.open(app.map, app.markers[kmid]);
          }
        }
      );
      $('#stores > .store.is-active').removeClass('is-active');
    },
    createItems: function() {
      $('#sidebar .stores').empty();
      var items_list = [];
      var items_nums = [];
      for (var i = 0; i < app.locations.length; i++) app.locations[i].id = i;
      for (var i = 0; i < app.locations.length; i++) {
        if (!app.locations[i].distance) {
          items_list[0] = app.locations;
          items_nums.push(0);
          break;
        }
        if (typeof items_list[app.locations[i].distance] == 'undefined') {
          items_nums.push(app.locations[i].distance);
          items_list[app.locations[i].distance] = [];
        }
        items_list[app.locations[i].distance].push(app.locations[i]);
      }
      items_nums.sort(function(a, b) {
        return a - b;
      });
      for (var i = 0; i < items_nums.length; i++) {
        var list = items_list[items_nums[i]];
        $.each(list, function(item_id, item) {
          $('#sidebar .stores').append((Template7.compile($('#storeTemplate').html()))(item));
        });
        $('#stores .store[data-id]')
          .filter(function() {
            return !$(this).data('data-click-setup');
          })
          .data('data-click-setup', true)
          .click(function() {
            app.info($(this).attr('data-id'));
          });
      }
    }
  }
  app.infobox = new google.maps.InfoWindow();
  app.infobox.addListener('closeclick', function() {
    $('#stores > .store.is-active').removeClass('is-active');
    app.map.panTo(app.center);
    app.map.setZoom(app.zoom[0]);
  });
  app.directionsbox = new google.maps.InfoWindow();
  app.directionsbox.addListener('closeclick', function() {
    app.infobox.open(app.map, app.active);
  });
  $.ajax({
    url: "js/locations.json",
    dataType: "json",
    success: function(data) {
      app.locations = data;
      app.map = new google.maps.Map(document.getElementById('map'), {
        center: app.center,
        zoom: app.zoom[0],
        clickableIcons: false,
        zoomControl: true,
        mapTypeControl: false,
        scaleControl: false,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: false
      });
      for (var i = 0; i < app.locations.length; i++) {
        var marker = new google.maps.Marker({
          position: app.location(i),
          map: app.map,
          animation: google.maps.Animation.DROP,
          icon: "img/marker.png",
          kmid: i
        });
        app.markers.push(marker);
        marker.addListener('click', app.info);
      }
      app.createItems();
      app.getDistances();
    },
    error: function() {
      if (window.location.protocol == 'file:') $('#loading > p').html('<strong>ERROR:</strong> JSON fetch not available in file://.');
      else $('#loading > p').html('<strong>ERROR:</strong> An error has occurred while fetching store location data.');
    }
  });
  $(window).on('resize', function() {
    if ($(window).width() > 767) $('#stores').collapse('show');
    else $('#stores').collapse('hide');
  }).trigger('resize');
});
