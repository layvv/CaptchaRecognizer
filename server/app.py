from flask import Flask, jsonify
from flask_cors import CORS
from utils.redis_client import init_redis
from utils.logger import setup_logger
import config
from api import register_routes

def create_app(config_name='default'):
    """创建Flask应用"""
    app = Flask(__name__)
    
    # 加载配置
    app.config.from_object(config.config[config_name])
    
    # 允许跨域请求
    CORS(app)
    
    # 初始化Redis
    init_redis(app)
    
    # 设置日志
    setup_logger(app)
    
    # 注册路由
    register_routes(app)
    
    # 错误处理
    @app.errorhandler(404)
    def page_not_found(e):
        return jsonify({"error": "资源不存在"}), 404
    
    @app.errorhandler(500)
    def internal_server_error(e):
        app.logger.error(f"服务器错误: {str(e)}")
        return jsonify({"error": "服务器内部错误"}), 500
    
    @app.route('/v1/health')
    def health_check():
        """健康检查接口"""
        return jsonify({
            "status": "ok",
            "version": app.config['VERSION'],
            "environment": app.config['ENV']
        })
    
    return app

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=config.config['default'].DEBUG) 