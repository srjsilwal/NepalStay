resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true # This line enables DNS support for the VPC. When set to true, it allows instances within the VPC to resolve domain names to IP addresses using Amazon's DNS service. This is essential for applications that rely on DNS resolution for communication between instances and external services.
  enable_dns_hostnames = true # This line enables DNS hostnames for instances launched in the VPC. When set to true, instances in the VPC will receive DNS hostnames, allowing them to be accessed using domain names instead of just IP addresses. This is useful for applications that rely on DNS resolution and for easier management of resources within the VPC.

  tags = {
    Name = "${var.name}-vpc"
  }
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id

  tags = {
    Name = "${var.name}-igw"
  }
}

resource "aws_subnet" "public" {
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = aws_vpc.this.id
  cidr_block              = var.public_subnet_cidrs[count.index] # count.index is used to iterate over the list of public_subnet_cidrs, allowing the creation of multiple public subnets with different CIDR blocks.
  availability_zone       = var.availability_zones[count.index]  # count.index is used to iterate over the list of availability_zones, ensuring that each public subnet is created in a different availability zone for high availability.
  map_public_ip_on_launch = true                                 # This line enables the automatic assignment of public IP addresses to instances launched in the public subnets. When set to true, instances in these subnets will receive a public IP address upon launch, allowing them to communicate with the internet directly.

  tags = {
    Name                     = "${var.name}-public-subnet-${count.index + 1}"
    "kubernetes.io/role/elb" = "1" # This tag is used to indicate that the subnet is intended for use with Elastic Load Balancers (ELBs) in a Kubernetes cluster. It helps Kubernetes identify which subnets are suitable for deploying ELBs, ensuring proper routing and load balancing of traffic to the appropriate instances within the cluster.
  }
}

resource "aws_subnet" "private" {
  count             = length(var.private_subnet_cidrs)
  vpc_id            = aws_vpc.this.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name                              = "${var.name}-private-subnet-${count.index + 1}"
    "kubernetes.io/role/internal-elb" = "1" # This tag is used to indicate that the subnet is intended for use with internal Elastic Load Balancers (ELBs) in a Kubernetes cluster. It helps Kubernetes identify which subnets are suitable for deploying internal ELBs, ensuring proper routing and load balancing of traffic to the appropriate instances within the cluster.
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id # This line creates a route in the public route table that directs all outbound traffic (0.0.0.0/0) to the internet gateway, allowing instances in the public subnets to access the internet.
  }

  tags = {
    Name = "${var.name}-public-route-table"
  }
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id # This line associates each public subnet with the public route table, ensuring that instances in these subnets use the correct routing rules for internet access.
}

resource "aws_eip" "nat" {
  count  = length(var.availability_zones) # availability_zones is used to create an Elastic IP (EIP) for each availability zone, allowing for high availability and redundancy in the NAT gateway setup.
  domain = "vpc"                          # This line specifies that the Elastic IP (EIP) address being created is for use within a Virtual Private Cloud (VPC). It ensures that the EIP is allocated in the context of the VPC, allowing it to be associated with resources like NAT gateways or instances within the VPC.

  tags = {
    Name = "${var.name}-nat-eip-${count.index + 1}"
  }
}

resource "aws_nat_gateway" "this" {
  count         = length(var.availability_zones)
  allocation_id = aws_eip.nat[count.index].id       # This line associates the NAT gateway with the corresponding Elastic IP (EIP) created for that availability zone. It ensures that each NAT gateway has a unique public IP address for outbound internet access.
  subnet_id     = aws_subnet.public[count.index].id # This line specifies the public subnet in which the NAT gateway will be created. It ensures that the NAT gateway is placed in a public subnet, allowing it to route traffic from private subnets to the internet.

  depends_on = [aws_internet_gateway.this] # This line ensures that the NAT gateway creation depends on the successful creation of the internet gateway. It guarantees that the NAT gateway is only created after the internet gateway is available, preventing potential issues with routing and connectivity.]

  tags = {
    Name = "${var.name}-nat-gateway-${count.index + 1}"
  }
}

resource "aws_route_table" "private" {
  count  = length(var.availability_zones)
  vpc_id = aws_vpc.this.id

  route {
    cidr_block     = "0.0.0.0/0"                          # This line creates a route in the private route table that directs all outbound traffic (0.0.0.0/0) to the NAT gateway, allowing instances in the private subnets to access the internet.
    nat_gateway_id = aws_nat_gateway.this[count.index].id # This line specifies the NAT gateway to be used for outbound traffic from the private subnets. It ensures that all internet-bound traffic from these subnets is routed through the NAT gateway, allowing for secure and controlled access to the internet.
  }
  tags = {
    Name = "${var.name}-private-route-table-${count.index + 1}"
  }
}

resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id # This line associates each private subnet with its corresponding private route table, ensuring that instances in these subnets use the correct routing rules for internet access through the NAT gateway.
}