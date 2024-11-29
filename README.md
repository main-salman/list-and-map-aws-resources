# Generate AWS diagram and list of resources automatically!
<img width="2023" alt="image" src="https://github.com/user-attachments/assets/72d1077d-dceb-4cf7-b6d3-b2aadd9176cb">

With this very easy to use and lightweight app, you can create and view a dynamic AWS diagram and also generate a list of all resources within an AWS diagram. It also shows relationships between items. You can also click on the links between items and move object around. This is really useful to see what's going on inside a particular account. Try it out - it's very easy to use!

Specific list of resource types are supported - but more will be added overtime as per demand. Current list of supported services:

* EC2
* VPC
* ECS
* Route 53
* ACM
* RDS
* ELB
* Lambda
* Events


This app was built using Cursor AI - https://www.cursor.com/

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Windows Instructions

### 1. Install Node.js
1. Go to the [Node.js website](https://nodejs.org/).
2. Download the Windows installer for the LTS (Long Term Support) version.
3. Run the installer and follow the prompts to complete the installation.
4. Verify the installation by opening the Command Prompt and running:
   ```bash
   node -v
   npm -v
   ```

### 2. Clone the Repository
1. Open the Command Prompt and navigate to the directory where you want to clone the repository.
2. Clone the repository:
   ```bash
   git clone https://github.com/main-salman/list-and-map-aws-resources.git
   cd list-and-map-aws-resources
   ```

### 3. Install Dependencies
1. Navigate to the project directory:
   ```bash
   cd list-and-map-aws-resources
   ```
2. Install the required dependencies:
   ```bash
   npm install
   ```

### 4. Create AWS Credentials
1. Go to AWS Console and create Access Key ID and Secret Access Key

### 5. Run the Application
1. Start the application:
   ```bash
   npm run dev
   ```
2. Open your web browser and navigate to `http://localhost:3000` to see your application running. 

### 7. Input the credentials
1. In your browser, input the AWS credentials. You access the AWS account with your credentials from your comptuer - so it's no different than using your AWS credentials on AWS CLI. The communication stays between your computer/server, wherever you are running this app, and AWS.




## Linux Instructions

### 1. Install Node.js
1. Open your terminal.
2. Install Node.js using a package manager. For Ubuntu/Debian, you can use:
   ```bash
   sudo apt update
   sudo apt install nodejs npm
   ```
3. Verify the installation by running:
   ```bash
   node -v
   npm -v
   ```

### 2. Clone the Repository
1. Open your terminal and navigate to the directory where you want to clone the repository.
2. Clone the repository:
   ```bash
   git clone https://github.com/main-salman/list-and-map-aws-resources.git
   cd list-and-map-aws-resources
   ```

### 3. Install Dependencies
1. Navigate to the project directory:
   ```bash
   cd list-and-map-aws-resources
   ```
2. Install the required dependencies:
   ```bash
   npm install
   ```

### 4. Create AWS Credentials
1. Go to the AWS Management Console and create an Access Key ID and Secret Access Key.


### 5. Run the Application
1. Start the application:
   ```bash
   npm run dev
   ```
2. Open your web browser and navigate to `http://localhost:3000` to see your application running.

### 6. Input the Credentials
1. In your browser, input the AWS credentials. You access the AWS account with your credentials from your computer, so it's no different than using your AWS credentials on the AWS CLI. The communication stays between your computer/server, wherever you are running this app, and AWS.

## Mac Instructions


### 1. Install Node.js
1. Open your terminal.
2. Install Node.js using Homebrew. If you don't have Homebrew installed, first install it with:
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
3. Install Node.js:
   ```bash
   brew install node
   ```
4. Verify the installation by running:
   ```bash
   node -v
   npm -v
   ```

### 2. Clone the Repository
1. Open your terminal and navigate to the directory where you want to clone the repository.
2. Clone the repository:
   ```bash
   git clone https://github.com/main-salman/list-and-map-aws-resources.git
   cd list-and-map-aws-resources
   ```

### 3. Install Dependencies
1. Navigate to the project directory:
   ```bash
   cd list-and-map-aws-resources
   ```
2. Install the required dependencies:
   ```bash
   npm install
   ```

### 4. Create AWS Credentials
1. Go to the AWS Management Console and create an Access Key ID and Secret Access Key.

### 5. Run the Application
1. Start the application:
   ```bash
   npm run dev
   ```
2. Open your web browser and navigate to `http://localhost:3000` to see your application running.

### 6. Input the Credentials
1. In your browser, input the AWS credentials. You access the AWS account with your credentials from your computer, so it's no different than using your AWS credentials on the AWS CLI. The communication stays between your computer/server, wherever you are running this app, and AWS.

