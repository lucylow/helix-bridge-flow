import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory
from flask_cors import CORS
from src.models.user import db
from src.routes.user import user_bp
from src.routes.oneinch_api import oneinch_bp
from src.routes.atomic_swap import atomic_swap_bp
from src.routes.partial_fills import partial_fills_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = 'asdf#FGSgvasgf$5$WGT'

# Enable CORS for all routes
CORS(app)

from src.routes.relayer import relayer_bp
from src.routes.resolver import resolver_bp
from src.routes.advanced_features import advanced_bp
from src.routes.demo_endpoints import demo_bp
from src.routes.threshold_encryption import threshold_bp
from src.routes.intent_routing import intent_bp
from src.routes.recovery_system import recovery_bp

app.register_blueprint(user_bp, url_prefix='/api')
app.register_blueprint(oneinch_bp, url_prefix='/api/1inch')
app.register_blueprint(atomic_swap_bp, url_prefix='/api/atomic-swap')
app.register_blueprint(partial_fills_bp, url_prefix='/api/partial-fills')
app.register_blueprint(relayer_bp, url_prefix='/api/relayer')
app.register_blueprint(resolver_bp, url_prefix='/api/resolver')
app.register_blueprint(advanced_bp, url_prefix='/api/advanced')
app.register_blueprint(demo_bp, url_prefix='/api/demo')
app.register_blueprint(threshold_bp, url_prefix='/api/threshold')
app.register_blueprint(intent_bp, url_prefix='/api/intent')
app.register_blueprint(recovery_bp, url_prefix='/api/recovery')

# uncomment if you need to use database
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)
with app.app_context():
    db.create_all()

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
            return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
