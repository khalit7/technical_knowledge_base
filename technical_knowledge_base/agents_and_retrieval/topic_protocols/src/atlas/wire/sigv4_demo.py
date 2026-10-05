"""Sign one AWS request with SigV4 using botocore and AWS's documented example credentials
(AKIDEXAMPLE / wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY), at the time of the run, and print the headers it adds.
Nothing is sent."""
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
from botocore.credentials import Credentials
creds = Credentials("AKIDEXAMPLE", "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY")
req = AWSRequest(method="GET", url="https://sts.amazonaws.com/?Action=GetCallerIdentity&Version=2011-06-15")
SigV4Auth(creds, "sts", "us-east-1").add_auth(req)
for k in ("X-Amz-Date", "Authorization"):
    print(f"{k}: {req.headers[k]}")
