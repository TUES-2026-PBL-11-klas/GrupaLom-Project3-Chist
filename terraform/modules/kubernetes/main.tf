# ── NGINX Ingress ────────────────────────────────────────────
resource "helm_release" "nginx_ingress" {
  name             = "ingress-nginx"
  repository       = "https://kubernetes.github.io/ingress-nginx"
  chart            = "ingress-nginx"
  version          = "4.10.0"
  namespace        = "ingress-nginx"
  create_namespace = true

  values = [yamlencode({
    controller = {
      service = {
        type                  = "LoadBalancer"
        externalTrafficPolicy = "Local"
      }
      config = {
        use-forwarded-headers = "true"
      }
    }
  })]
}

# ── CNPG Operator ────────────────────────────────────────────
resource "helm_release" "cnpg_operator" {
  name             = "cnpg"
  repository       = "https://cloudnative-pg.github.io/charts"
  chart            = "cloudnative-pg"
  version          = "0.21.6"
  namespace        = "cnpg-system"
  create_namespace = true
  wait             = true
  timeout          = 300
}
# ── RabbitMQ ─────────────────────────────────────────────────
resource "helm_release" "rabbitmq" {
  name             = "rabbitmq"
  repository       = "oci://registry-1.docker.io/bitnamicharts"
  chart            = "rabbitmq"
  version          = "16.0.14"
  namespace        = "rabbitmq"
  create_namespace = true
  wait             = true
  timeout          = 600

  values = [yamlencode({
    global = {
      imageRegistry = "acrchistdev.azurecr.io"
      security = {
        allowInsecureImages = true
      }
    }
    auth = {
      username = "chist"
      password = var.rabbitmq_password
    }
    persistence = {
      enabled = true
      size    = "1Gi"
    }
    resources = {
      requests = { cpu = "100m", memory = "256Mi" }
      limits   = { cpu = "500m", memory = "512Mi" }
    }
    service = {
      type = "ClusterIP"
    }
  })]

  depends_on = [helm_release.nginx_ingress]
}

# ── ArgoCD ───────────────────────────────────────────────────
resource "helm_release" "argocd" {
  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  version          = "7.8.13"
  namespace        = "argocd"
  create_namespace = true

  values = [yamlencode({
    server = {
      extraArgs = ["--insecure"]
      ingress = {
        enabled          = true
        ingressClassName = "nginx"
        hostname         = var.argocd_hostname
        servicePort      = 80
        annotations = {
          "nginx.ingress.kubernetes.io/ssl-redirect"       = "false"
          "nginx.ingress.kubernetes.io/backend-protocol"   = "HTTP"
          "nginx.ingress.kubernetes.io/force-ssl-redirect" = "false"
        }
        tls = false
      }
    }
  })]

  depends_on = [helm_release.nginx_ingress]
}

# ── ArgoCD Apps ──────────────────────────────────────────────
resource "helm_release" "argocd_apps" {
  name             = "argocd-apps"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argocd-apps"
  version          = "2.0.2"
  namespace        = "argocd"
  create_namespace = false

  values = [file("${path.module}/templates/argocd-apps-values.yaml")]

  depends_on = [helm_release.argocd]
}

# ── Namespaces ───────────────────────────────────────────────
resource "kubernetes_namespace" "db" {
  metadata { name = "db" }
}

resource "kubernetes_namespace" "chist" {
  metadata { name = "chist" }
}

# ── CNPG bootstrap credentials secret ───────────────────────
# Used by cluster.yaml to create the superuser on first init.
# One secret covers all four databases – CNPG creates each DB
# with this owner.
resource "kubernetes_secret" "cnpg_app_credentials" {
  metadata {
    name      = "cnpg-app-credentials"
    namespace = kubernetes_namespace.db.metadata[0].name
  }
  data = {
    username = var.db_username
    password = var.db_password
  }
  type = "kubernetes.io/basic-auth"
}

# ── RabbitMQ connection secret (consumed by all services) ────
resource "kubernetes_secret" "rabbitmq_secret" {
  metadata {
    name      = "rabbitmq-secret"
    namespace = kubernetes_namespace.chist.metadata[0].name
  }
  data = {
    RABBITMQ_HOST     = "rabbitmq.rabbitmq.svc.cluster.local"
    RABBITMQ_PORT     = "5672"
    RABBITMQ_USER     = "chist"
    RABBITMQ_PASSWORD = var.rabbitmq_password
  }
}

# ── Per-service backend secrets ──────────────────────────────
# Each microservice gets its own secret with its own DB URL.
# All share the same JWT, mail, and Computer Vision config.

resource "kubernetes_secret" "secret_user" {
  metadata {
    name      = "secret-user"
    namespace = kubernetes_namespace.chist.metadata[0].name
  }
  data = {
    DB_URL      = "jdbc:postgresql://cnpg-cluster-rw.db.svc.cluster.local:5432/chist_users"
    DB_USERNAME = var.db_username
    DB_PASSWORD = var.db_password

    JWT_SECRET     = var.jwt_secret
    JWT_EXPIRATION = "86400000"

    MAIL_HOST     = var.mail_host
    MAIL_PORT     = var.mail_port
    MAIL_USERNAME = var.mail_username
    MAIL_PASSWORD = var.mail_password

    COMPUTER_VISION_ENDPOINT = var.computer_vision_endpoint
    COMPUTER_VISION_KEY      = var.computer_vision_key

    AZURE_KEY_VAULT_NAME = var.key_vault_name
  }
}

resource "kubernetes_secret" "secret_report" {
  metadata {
    name      = "secret-report"
    namespace = kubernetes_namespace.chist.metadata[0].name
  }
  data = {
    DB_URL      = "jdbc:postgresql://cnpg-cluster-rw.db.svc.cluster.local:5432/chist_reports"
    DB_USERNAME = var.db_username
    DB_PASSWORD = var.db_password

    JWT_SECRET     = var.jwt_secret
    JWT_EXPIRATION = "86400000"

    USER_SERVICE_URL         = "http://user-module.chist.svc.cluster.local:8080"
    COMPUTER_VISION_ENDPOINT = var.computer_vision_endpoint
    COMPUTER_VISION_KEY      = var.computer_vision_key

    AZURE_KEY_VAULT_NAME = var.key_vault_name
  }
}

resource "kubernetes_secret" "secret_verification" {
  metadata {
    name      = "secret-verification"
    namespace = kubernetes_namespace.chist.metadata[0].name
  }
  data = {
    DB_URL      = "jdbc:postgresql://cnpg-cluster-rw.db.svc.cluster.local:5432/chist_verification"
    DB_USERNAME = var.db_username
    DB_PASSWORD = var.db_password

    JWT_SECRET     = var.jwt_secret
    JWT_EXPIRATION = "86400000"

    USER_SERVICE_URL         = "http://user-module.chist.svc.cluster.local:8080"
    COMPUTER_VISION_ENDPOINT = var.computer_vision_endpoint
    COMPUTER_VISION_KEY      = var.computer_vision_key

    AZURE_KEY_VAULT_NAME = var.key_vault_name
  }
}

resource "kubernetes_secret" "secret_notification" {
  metadata {
    name      = "secret-notification"
    namespace = kubernetes_namespace.chist.metadata[0].name
  }
  data = {
    DB_URL      = "jdbc:postgresql://cnpg-cluster-rw.db.svc.cluster.local:5432/chist_notif"
    DB_USERNAME = var.db_username
    DB_PASSWORD = var.db_password

    JWT_SECRET     = var.jwt_secret
    JWT_EXPIRATION = "86400000"

    MAIL_HOST     = var.mail_host
    MAIL_PORT     = var.mail_port
    MAIL_USERNAME = var.mail_username
    MAIL_PASSWORD = var.mail_password

    USER_SERVICE_URL = "http://user-module.chist.svc.cluster.local:8080"

    AZURE_KEY_VAULT_NAME = var.key_vault_name
  }
}
