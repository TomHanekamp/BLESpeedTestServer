import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import * as cognito from '@aws-cdk/aws-cognito';

export class BleSpeedTestServerStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const hello = new lambda.Function(this, 'HelloHandler', {
      functionName: "AndroidAppLambda",
      runtime: lambda.Runtime.NODEJS_10_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'hello.handler'
    })

    let identityPool = new cognito.CfnIdentityPool(this, 'JavaFunctionAndroidEventHandlerPool', {
      identityPoolName: "AndroidIdentityPool",
      allowUnauthenticatedIdentities: true
    });

    let authenticatedRole = new iam.Role(this, 'AndroidAppLambdaAuthenticatedRole', {
      assumedBy: new iam.WebIdentityPrincipal('cognito-identity.amazonaws.com', {
        "StringEquals": {
          "cognito-identity.amazonaws.com:aud": identityPool.ref
        },
        "ForAnyValue:StringLike": {
          "cognito-identity.amazonaws.com:amr": "authenticated"
        }
      })
    })

    let unAuthenticatedRole = new iam.Role(this, 'AndroidAppLambdaUnAuthenticatedRole', {
      assumedBy: new iam.WebIdentityPrincipal('cognito-identity.amazonaws.com', {
        "StringEquals": {
          "cognito-identity.amazonaws.com:aud": identityPool.ref
        },
        "ForAnyValue:StringLike": {
          "cognito-identity.amazonaws.com:amr": "unauthenticated"
        }
      })
    })

    authenticatedRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "mobileanalytics:PutEvents",
        "cognito-sync:*"
      ],
      resources: ['*']
    }));

    unAuthenticatedRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "mobileanalytics:PutEvents",
        "cognito-sync:*"
      ],
      resources: ['*']
    }));

    authenticatedRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "lambda:invokefunction"
      ],
      resources: [hello.functionArn]
    }));
    
    unAuthenticatedRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "lambda:invokefunction"
      ],
      resources: [hello.functionArn]
    }));

    new cognito.CfnIdentityPoolRoleAttachment(this, "DefaultValid", {
      identityPoolId: identityPool.ref,
      roles: {
        "authenticated": authenticatedRole.roleArn,
        "unauthenticated": unAuthenticatedRole.roleArn
      }
    });
  }
}
