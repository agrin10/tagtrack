from src import create_app

app = create_app()


@app.route('/')
def index():
    return 'this is test'

if '__main__'== __name__:
    app.run(host='0.0.0.0' , port=8080 , debug=True)
