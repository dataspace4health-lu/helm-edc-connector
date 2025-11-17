pipeline {
    agent any

    environment {
        HELM_NAME = "${env.JOB_NAME.tokenize('/').dropRight(1).takeRight(1).join('-').toLowerCase()}"
    }

    parameters {
        string(name: 'MICROSERVICE_ROOT_PATH', defaultValue: 'DS4H/Microservices', description: 'Base path of the microservice pipelines')
        booleanParam(name: 'PUBLISH_HELM', defaultValue: false, description: 'Publish Helm after build')
    }

    stages {
        stage('Package Helm Chart') {
            steps {
                echo "Packaging Helm chart..."
                sh "helm dependency update"
                sh "helm package . --destination ./helm"
            }
        }
        
        stage('Lint') {
            steps {
                echo "Linting Helm chart"
                sh """
                    mkdir -p build/reports/lint
                    helm lint . | sed 's/^/<pre>/' | sed '\$a</pre>' > build/reports/lint/helm-lint-report.html
                """
            }
            post {
                always {
                    archiveArtifacts artifacts: 'build/reports/lint/helm-lint-report.html', allowEmptyArchive: true
                }
            }
        }
        
        // stage('Build Images') {
        //     steps {
        //         script {
        //             sh "helm dependency build"
        //             // Get helm images
        //             def imagesRaw = sh(
        //                 script: """
        //                     helm template . \
        //                     | grep -E 'image:\\s' \
        //                     | sed -E 's/.*\\/([^:]+:[^"]+).*/\\1/'
        //                 """,
        //                 returnStdout: true
        //             ).trim()

        //             // Split by line, remove duplicates, convert to a proper List/array
        //             def images = imagesRaw.tokenize('\n').unique()
        //             echo "Got helm images: ${images}"

        //             // Find all jobs with mame contained in the images
        //             def parallelSteps = [:]
        //             def parallelResults = [:]
        //             images.each { image ->
        //                 def jobName = "${params.MICROSERVICE_ROOT_PATH}/${image.split(":")[0]}"
        //                 def tag = image.split(":")[1] == "latest" ? "main" : "tags/v${tag}"
        //                 parallelSteps[image] = {
        //                     try {
        //                         echo "Triggering pipeline: ${jobName}"
        //                         parallelResults["${jobName}/${tag}"] = build(
        //                             job: "${jobName}/${tag}",
        //                             parameters: [string(name: 'PUBLISH', value: "true")],
        //                             wait: true,       // wait for completion
        //                             propagate: true   // fail this pipeline if triggered job fails
        //                         )
        //                     } catch (err) {
        //                         if (err != "No item named ${jobName}/${tag} found")
        //                         {
        //                             catchError(buildResult: 'SUCCESS', stageResult: 'ABORTED') {
        //                                 error("No pipeline was found with name ${jobName}/${tag}. Assuming this is an external dependency.")
        //                             }
        //                         }
        //                         else {
        //                             error("Error triggering job ${jobName}/${tag}: ${err}")
        //                         }
        //                     }
        //                 }
        //             }

        //             if (parallelSteps && !parallelSteps.isEmpty()) {
        //                 parallel parallelSteps

        //                 // Evaluate results
        //                 def finalStatus = 'SUCCESS'
        //                 parallelResults.each { name, res ->
        //                     echo "Pipeline ${name} result: ${res.result}"
        //                     if (res.result == 'FAILURE') {
        //                         finalStatus = 'FAILURE'
        //                     }
        //                 }

        //                 // If any FAILURE → fail main pipeline
        //                 if (finalStatus == 'FAILURE') {
        //                     error("Main pipeline failed because at least one child failed.")
        //                 } else {
        //                     echo "Main pipeline succeeded (aborted children ignored)."
        //                 }
        //             }
        //         }
        //     }
        // }

        stage('Deploy to Kubernetes') {
            steps {
                script {
                    // creates a k3d cluster
                    // returns the cluster object
                    // nodes: number of worker nodes
                    def createCluster = { nodes = 0 -> 
                        def cluster = [:]
                        env.KUBECONFIG = ".jenkins/kubeconfig"
                        cluster.name = "${env.HELM_NAME}-${env.BUILD_ID}"
                        // writeFile file: "${env.CLUSTER_FILE}", text: cluster.name
                        // TODO env.KUBECONFIG, env.DNS_NAME

                        def registryIP = sh(script: "getent hosts ds4h-registry | awk '{print \$1}'", returnStdout: true).trim()
                        // sh "k3d cluster create ${cluster.name} --servers 1 --servers-memory 4G --agents ${nodes} --agents-memory 8G --no-lb --host-alias ${registryIP}:ds4h-registry --registry-use ds4h-registry:5432 --kubeconfig-update-default=false --kubeconfig-switch-context=false"
                        sh "k3d cluster create ${cluster.name} --servers 1 --servers-memory 4G --agents ${nodes} --agents-memory 8G --no-lb --host-alias ${registryIP}:ds4h-registry --kubeconfig-update-default=false --kubeconfig-switch-context=false"
                        sh "k3d kubeconfig get ${cluster.name} > ${env.KUBECONFIG}"
                        sh "chmod 600 ${env.KUBECONFIG}"
                        cluster.net = sh(script: "docker inspect -f '{{range \$key, \$value := .NetworkSettings.Networks}}{{println \$key}}{{end}}' k3d-${cluster.name}-server-0", returnStdout: true).trim()
                        cluster.server_ip = sh(script: "docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' k3d-${cluster.name}-server-0", returnStdout: true).trim()
                        sh """
                        until kubectl -n kube-system get configmap coredns > /dev/null 2>&1; do
                            echo "Waiting for ConfigMap 'coredns' to be available..."
                            sleep 5
                        done
                        """
                        // def secrets = [
                        //     [path: 'secret/jenkins/ds4h/azure-registry-ro-sp', secretValues: 
                        //         [
                        //             [envVar: 'APP_ID', vaultKey: 'app-id'], 
                        //             [envVar: 'SP_PASSWORD', vaultKey: 'password']
                        //         ]
                        //     ]
                        // ]
                        // withVault([vaultSecrets: secrets]) {
                        //     sh("kubectl create secret docker-registry acr-creds --docker-server=${params.registry_domain} --docker-username=$APP_ID --docker-password=$SP_PASSWORD")
                        // }
                        sh "pwd"
                        sh "kubectl apply -f .jenkins/traefik-config.yaml"
                        sh "helm repo add jetstack https://charts.jetstack.io --force-update"
                        sh "helm repo update"
                        sh "helm install cert-manager jetstack/cert-manager --namespace cert-manager --create-namespace --version v1.14.4 --set installCRDs=true --timeout 10m"
                        sh "kubectl apply -f .jenkins/ca-issuer.yaml"
                        sh "kubectl apply -f .jenkins/ca-certificate.yaml"
                        sh "kubectl apply -f .jenkins/issuer.yaml"
                        sh "kubectl apply -f .jenkins/certificate.yaml"
                        sh "kubectl wait --for=condition=Ready certificate/dataspace4health.local --timeout=300s"
                        sh """
                        kubectl -n kube-system get cm coredns -o yaml | \
                        sed 's#NodeHosts: |#NodeHosts: |\\n    ${cluster.server_ip} dataspace4health.local#' | \
                        kubectl apply -f -
                        """
                        return cluster
                    }

                    def cluster = createCluster(2)
                    // echo "Deploying helm to Kubernetes ..."
                    sh """
                        helm upgrade --install edc-connector helm/*.tgz \
                            --namespace default \
                            --kube-context .jenkins/kubeconfig
                    """
                }
            }
        }

        stage('Post-Deployment Verification') {
            steps {
                script {
                    echo "Checking rollout status..."
                    sh """
                        kubectl --context .jenkins/kubeconfig -n default rollout status deployment/edc-controlplane --timeout=120s
                        kubectl --context .jenkins/kubeconfig -n default rollout status deployment/edc-dataplane --timeout=120s
                        kubectl --context .jenkins/kubeconfig -n default rollout status deployment/edc-identityhub --timeout=120s
                        kubectl --context .jenkins/kubeconfig -n default rollout status deployment/edc-dashboard --timeout=120s
                    """
                }
            }
        }

        // stage('Test') {
        //     // steps {
        //     //     echo "Running Playwright end-to-end tests..."

        //     //     dir('tests') { // assuming your Playwright tests are in ./tests
        //     //         sh """
        //     //             npm ci
        //     //             npx playwright install --with-deps
        //     //             npx playwright test --reporter=html
        //     //         """
        //     //     }
        //     // }
        //     // post {
        //     //     always {
        //     //         archiveArtifacts artifacts: 'build/reports/playwright/test-report.html', allowEmptyArchive: true
        //     //     }
        //     // }
        // }

        // stage("Code Quality Check (SonarQube)") {
        //     steps {
        //         withSonarQubeEnv('sonar') {
        //             script {
        //                 def scannerHome = tool "sonar"
        //                 sh """
        //                     ${scannerHome}/bin/sonar-scanner -X \
        //                         -Dsonar.projectKey=${DOCKER_IMAGE} \
        //                         -Dsonar.sources=. \
        //                         -Dsonar.branch.name=${env.GIT_BRANCH.replaceFirst("^origin/", "")}
        //                 """

        //                 // // Wait for the Quality Gate result
        //                 // timeout(time: 10, unit: 'MINUTES') {
        //                 //     def qg = waitForQualityGate()
        //                 //     if (qg.status != 'OK') {
        //                 //         error "❌ Quality Gate failed: ${qg.status}"
        //                 //     } else {
        //                 //         echo "✅ Quality Gate passed: ${qg.status}"
        //                 //     }
        //                 // }
        //             }
        //         }
        //     }
        // }

        // stage("Security Scan (Trivy)") {
        //     steps {
        //         sh """
        //             helm template . | docker run --rm \
        //                 -v /var/run/docker.sock:/var/run/docker.sock \
        //                 -v \$PWD/built/reports/trivy:/output \
        //                 -v \$PWD/.jenkins/trivy-html.tpl:/template.tpl \
        //                 aquasec/trivy:latest \
        //                 image ${IMAGE_NAME} \
        //                 --exit-code 1 --timeout 15m --severity HIGH,CRITICAL \
        //                 --format template --template "@/template.tpl" --output /output/trivy.html \
        //                 -
        //         """
        //     }
        //     post {
        //         always {
        //             archiveArtifacts 'built/reports/trivy/trivy.html'
        //         }
        //     }
        // }

        // stage('Publish Helm') {
        //     when {
        //         expression { return params.PUBLISH_IMAGE == true }
        //     }
        // }
    }

    post {
        always {
            script {
                cleanWs()
                
                // Detect if build was triggered manually or by SCM
                def causes = currentBuild.getBuildCauses()
                def isManual = causes.any { it.toString().contains('UserIdCause') }
                def isSCM = causes.any { it.toString().contains('SCMTrigger') || it.toString().contains('GitLabWebHookCause') }
                def isUpstream = causes.any { it.toString().contains('UpstreamCause') }

                // sh """
                //     docker rmi -f ${IMAGE_NAME}
                // """

                if (isManual) {
                    echo "Build test triggered manually — sending email to Requester"
                    emailext(
                        recipientProviders: [[$class: 'RequesterRecipientProvider']],
                        subject: "Manual Build ${currentBuild.currentResult}: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                        body: "The manually triggered Jenkins build (${env.JOB_NAME} #${env.BUILD_NUMBER}) has completed with result: ${currentBuild.currentResult}.\n\nDetails: ${env.BUILD_URL}"
                    )
                } else if (isSCM) {
                    echo "Build triggered by SCM — sending email to Developers"
                    emailext(
                        recipientProviders: [[$class: 'DevelopersRecipientProvider']],
                        subject: "Committed Build ${currentBuild.currentResult}: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                        body: "The Jenkins build was triggered by a code commit and has completed with result: ${currentBuild.currentResult}.\n\nDetails: ${env.BUILD_URL}"
                    )
                } else {
                    echo "Build triggered by another cause — sending default notification"
                    emailext(
                        recipientProviders: [[$class: 'DevelopersRecipientProvider']],
                        subject: "Build ${currentBuild.currentResult}: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                        body: "This build was triggered automatically or by another cause with result: ${currentBuild.currentResult}..\n\nDetails: ${env.BUILD_URL}"
                    )
                }
            }
        }
    }
}
