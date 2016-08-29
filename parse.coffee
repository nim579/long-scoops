fs   = require 'fs'
path = require 'path'
gc   = require 'multi-geocoder'

class ProcessFile
    cols:
        id: '#'
        address: 'Address'
        found:   'Found address'
        long:    'Long'
        lat:     'Lat'

    constructor: (file)->
        @_promise = new Promise (resolve)=>
            @file = file
            @_coder = new gc
                coordorder: 'longlat'
                lang: 'ru-RU'

            resolve(file)

        return @_promise
        .then (f)=> @load f
        .then    => @code()
        .then (d)=> @prepare d
        .then    => @save()

    load: (file)->
        text = String fs.readFileSync file
        lines = text.split '\n'
        strings = lines.map (l)-> return l.split '\t'
        strings = strings.filter (l)-> return l and l.length > 1

        @data = strings.map (l)->
            id:   if l[0] then Number(l[0]) else null
            address: l[1] or null
            long:    l[2] or null
            lat:     l[3] or null

        return @data

    prepare: (d)->
        if d?.result?.features and d.result.features.length is @data.length
            for point, i in d.result.features
                place = @data[i]
                place.id    = i+1
                place.found = point.properties.name
                place.long  = point.geometry.coordinates[0]
                place.lat   = point.geometry.coordinates[1]

        return @data

    code: ->
        return @_coder.geocode @data.map (p)-> return "Москва, #{p.address}"

    save: ->
        lines = @data.map (p)-> return "#{p.id}\t#{p.address}\t#{p.found}\t#{p.long}\t#{p.lat}"
        lines.unshift "#{@cols.id}\t#{@cols.address}\t#{@cols.found}\t#{@cols.long}\t#{@cols.lat}"
        csv  = lines.join '\n'
        json = JSON.stringify places: @data, null, 4

        dir      = path.dirname(@file)
        csvPath  = path.basename(@file, path.extname(@file))+'_ready.csv'
        jsonPath = path.basename(@file, path.extname(@file))+'_ready.json'

        fs.writeFileSync path.join(dir, csvPath),  csv
        fs.writeFileSync path.join(dir, jsonPath), json

Promise.all [new ProcessFile('./data/1.csv'), new ProcessFile('./data/2.csv')]
.then console.log, console.error

# module.exports = ProcessFile
