pipeline {
    agent any

    environment {
        DOCKER_IMAGE = "${env.JOB_NAME.tokenize('/')[-2..-1].join('-').toLowerCase()}"
        DOCKER_TAG = "${env.BUILD_NUMBER}"
        IMAGE_NAME = "${DOCKER_IMAGE}:${DOCKER_TAG}"
    }

    parameters {
        string(name: 'MICROSERVICE_ROOT_PATH', defaultValue: 'DS4H/Microservices', description: 'Base path of the microservice pipelines')
        string(name: 'IMAGE_REGISTRY_NAME', defaultValue: 'management.local:5000', description: 'Image registry name')
        booleanParam(name: 'PUBLISH_HELM', defaultValue: false, description: 'Publish Helm after build')
    }

    stages {
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
        
        stage('Build Images') {
            steps {
                script {
                    sh "helm dependency build"
                    // Get helm images
                    // | grep '${params.IMAGE_REGISTRY_NAME}' \
                    def imagesRaw = sh(
                        script: """
                            helm template . \
                            | grep -E 'image:\\s' \
                            | sed -E 's/.*\\/([^:]+:[^"]+).*/\\1/'
                        """,
                        returnStdout: true
                    ).trim()

                    // Split by line, remove duplicates, convert to a proper List/array
                    def images = imagesRaw.tokenize('\n').unique()
                    echo "Got helm images: ${images}"

                    // Find all jobs with mame contained in the images
                    def parallelSteps = [:]
                    images.each { image ->
                        def jobName = "${params.MICROSERVICE_ROOT_PATH}/${image.split(":")[0]}"
                        def tag = image.split(":")[1] == "latest" ? "main" : "tags/v${tag}"
                        parallelSteps[image] = {
                            try {
                                echo "Triggering pipeline: ${jobName}"
                                def buildInfo = build(
                                    job: "${jobName}/${tag}",
                                    parameters: [string(name: 'PUBLISH', value: "true")],
                                    wait: true,       // wait for completion
                                    propagate: true   // fail this pipeline if triggered job fails
                                )
                                echo "Job ${jobName}/${tag} finished with status: ${buildInfo.getResult()}"
                            } catch (err) {
                                if (err != "No item named ${jobName}/${tag} found")
                                {
                                    echo "No pipeline was found with name ${jobName}/${tag}. Assuming this is an external dependency."
                                    catchError(buildResult: 'ABORTED', stageResult: 'ABORTED') {
                                        sh 'exit 1'
                                    }
                                }
                                else {
                                    error("Error triggering job ${jobName}/${tag}: ${err}")
                                }
                            }
                        }
                    }

                    if (parallelSteps && !parallelSteps.isEmpty()) {
                        parallel parallelSteps
                    }
                }
            }
        }

        // stage('Package Helm Chart') {
        //     // echo "Packaging Helm chart..."
        //     // sh "helm package . --destination ./helm"
        // }

        // stage('Deploy to Kubernetes') {
        //     // echo "Deploying helm to Kubernetes ..."
        //     // sh """
        //     //     helm upgrade --install ${helmRelease} ${chartDir} \
        //     //         --namespace ${helmNamespace} \
        //     //         --set image.repository=myregistry.io/${appName} \
        //     //         --set image.tag=${env.BUILD_NUMBER} \
        //     //         --kube-context ${kubeContext}
        //     // """
        // }

        // stage('Post-Deployment Verification') {
        //     // echo "Checking rollout status..."
        //     // sh """
        //     //     kubectl --context ${kubeContext} -n ${helmNamespace} rollout status deployment/${appName} --timeout=120s
        //     // """
        // }

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
