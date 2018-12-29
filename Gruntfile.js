module.exports = function(grunt){
var gruntConfig = ({
    pkg: grunt.file.readJSON('package.json'),
    
    plato: {
        telstraCodeReport: {
            files: {
                'telstra/report/': ['js/telstra/*.js']
            }
        }
        },

        yuidoc: {
            compile: {
                name: '<%= pkg.name %>',
                description: '<%= pkg.description %>',
                version: '<%= pkg.version %>',
                url: '<%= pkg.homepage %>',
                options: {
                    paths: 'js/telstra/',
                    outdir: 'telstra/docs/'
                }
            }
        }
    });

grunt.initConfig(gruntConfig);
grunt.loadNpmTasks('grunt-plato');
grunt.loadNpmTasks('grunt-contrib-yuidoc');

grunt.registerTask('telstra', function(target){
        grunt.task.run([
            'plato',
            'yuidoc'
        ])
    });
};