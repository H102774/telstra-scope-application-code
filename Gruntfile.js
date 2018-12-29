module.exports = function(grunt){
var gruntConfig = ({
    pkg: grunt.file.readJSON('package.json'),
    
    plato: {
        telstraCodeReport: {
            files: {
                'telstra/reports/code_review_tool': ['js/telstra/code_review_tool/*.js']
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
                    paths: 'js/telstra/code_review_tools/*js',
                    outdir: 'docs/telstra/code_review_tool'
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