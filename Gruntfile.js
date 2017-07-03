module.exports = function(grunt){
var gruntConfig = ({
    pkg: grunt.file.readJSON('package.json'),
    
    plato: {
        acofCodeReport: {
            files: {
                'acof/report/': ['js/acof/*.js']
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
                    paths: 'js/acof/',
                    outdir: 'acof/docs/'
                }
            }
        }
    });

grunt.initConfig(gruntConfig);
grunt.loadNpmTasks('grunt-plato');
grunt.loadNpmTasks('grunt-contrib-yuidoc');

grunt.registerTask('acof', function(target){
        grunt.task.run([
            'plato',
            'yuidoc'
        ])
    });
};