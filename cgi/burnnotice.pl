#!/usr/bin/perl -w

use warnings;
use strict;
use CGI;
use Net::OpenSSH;
use XML::XPath;
use XML::XPath::XMLParser;
use XML::LibXML;
use DBI;
use Socket;
use List::Util;

    #Debug Variables
    #0 = no prints
    #1 = basic debug prints
    #2 = all debug prints
    my $globalDebugLevel = 2;
    my $debugExecuteDeployment = 1;
    my %debugSshTypes = ('SSH' => 1, 'OVFTOOL' => 1, 'CGI' => 1, 'MYSQL' => 1, 'ESXI' =>1);
    my ($sec,$min,$hour,$day,$month,$year,$wday,$yday,$isdst) = localtime(time);
    my $timestamp = sprintf("%d%d%d_%d%d%d", $year, $month, $day, $hour, $min, $sec);
    my $cgi;
    my $perlMode;
    my $vlanLastId = 1000;
    
    #Determine how script was called
    if (exists $ENV{'REMOTE_ADDR'})
    {
        #script is called from Apache CGI
        $perlMode = 'cgi';
        $cgi = CGI->new();
        if ($cgi->param('submissionType') eq 'deploy')
        {
            #Print HTTP Header
            print CGI::header();
        }
    }
    else
    {
        #script is called from terminal
        $perlMode = 'terminal';
        debugPrint('CGI', 1, "Perl is in terminal mode");
    }
    
    #MySQL Variables
    my ($mysqlDatabase, $mysqlHostname, $mysqlPort) = ("burnnotice", "localhost", "3306");
    my ($mysqlUser, $mysqlPassword) = ("root", '');
    
    #SSH Variables
    my ($ovftoolHost, $ovftoolUser, $ovftoolPass) = ("localhost", "root", "");
    my ($esxiHost, $esxiResourcePath, $esxiUser, $esxiPass) = ("metalgear.gcl.lgsdirect.com", "ASender/BurnNotice", "asender", '');
    
    #Retrieve "hidden" passwords
    open PASS_FILE, "../../../password.txt";
    while(<PASS_FILE>)
    {($esxiPass, $ovftoolPass, $mysqlPassword) = split "\t", ($_);}
    close PASS_FILE;
    
    #Connect to MySQL
    my $dbh = startMySqlConnection();
    
    
    my ($svgXml,$submissionType);
    if ($perlMode eq 'terminal')
    {
        #Read previous MySQL submission
        my $sth = queryMySql($dbh, 'SELECT * FROM submissionLogs ORDER BY timestamp DESC LIMIT 1;');
        my $ref = $sth->fetchrow_hashref();
        $svgXml = $ref->{'svg'};
        $submissionType = $ref->{'submissionType'};
        $esxiResourcePath = $ref->{"resourcePath"};
        $esxiHost = $ref->{"esxiIpAddress"};
        $sth->finish;
        debugPrint('CGI', 1, "esxiHost = $esxiHost");
    }
    else
    {
        #CGI Post
        $svgXml = $cgi->param('svgInput');
        my $hostname = gethostbyaddr(inet_aton($ENV{REMOTE_ADDR}), AF_INET);
        $submissionType = $cgi->param('submissionType');
        $esxiResourcePath = $cgi->param("esxiPath");
        $esxiHost = $cgi->param("esxiHost");
        $esxiUser = $cgi->param("esxiUser");
        $esxiPass = $cgi->param("esxiPass");
        
        $dbh->do("INSERT INTO `$mysqlDatabase`.`submissionLogs` (`svg`, `userIpAddress`, `userBrowserType`, `submissionType`, `esxiIpAddress`, `resourcePath` ) VALUES ('$svgXml', '$hostname', '$ENV{HTTP_USER_AGENT}', '$submissionType', '$esxiHost', '$esxiResourcePath');");
    }
    
    if ($perlMode eq 'cgi' and $cgi->param('submissionType') eq 'deploy')
    {
        debugPrint('CGI', 1, "submissionType = $submissionType");
        debugPrint('CGI', 2, "svgXml = $svgXml");
        debugPrint('MYSQL', 1, "Inserting entry");
        debugPrint('CGI', 1, "esxiHost = $esxiHost");
        debugPrint('CGI', 1, "esxiUser = $esxiUser");
    }
    
    
    #Determine Submission Type
    if ($submissionType eq 'download')
    {
        my $filename = "burnnotice_$timestamp.svg";
        print ("Content-Type:application/x-download\n");
        print "Content-Disposition: attachment; filename=$filename\n\n";

        print $svgXml;
        exit;
    }
    
    
    #Setup SSH Connections
    my $esxiSSH    = startNewSSH($esxiHost,    $esxiUser,    $esxiPass);
    my $ovftoolSSH = startNewSSH($ovftoolHost, $ovftoolUser, $ovftoolPass);
    my $stdout;
    
    #Test SSH session is working with simple list command
    $stdout = execSSH($esxiSSH, "ls -la");
    $stdout = execSSH($ovftoolSSH, "ls -la");
    
    #Query Current vSwitches on ESXi server
    $stdout = execSSH($esxiSSH, "esxcli network vswitch standard list");
    my @vSwitchesPadded;
    while ($stdout =~ m/Name: vSwitch(\d+)/g)
    {
        push @vSwitchesPadded, sprintf("%03d", $1);
    }
    @vSwitchesPadded = sort @vSwitchesPadded;
    debugPrint('ESXI', 1, "vSwitches Being Used: " . join ",", @vSwitchesPadded);
    
    my $newVSwitch = int(List::Util::max(@vSwitchesPadded)) + 1;
    debugPrint('ESXI', 1, "New vSwitch will be $newVSwitch");
    
    #Query Current Port Groups on ESXi server
    $stdout = execSSH($esxiSSH, "esxcli network vswitch standard portgroup list");
    my @vmPortGroups;
    while ($stdout =~ m/\n(.*\w)\s+vSwitch/g)
    {
        push @vmPortGroups, $1;
    }
    @vmPortGroups = sort @vmPortGroups;
    debugPrint('ESXI', 1, "VM Port Groups Being Used: " . join ",", @vmPortGroups);
    my @linkItems = parseSvgForLinks($svgXml);
    #Add vSwitches
    if ($debugExecuteDeployment) 
    {
        #Add vSwitch
        $stdout = execSSH($esxiSSH, "esxcli network vswitch standard add    --vswitch-name=vSwitch$newVSwitch");
        #del vswitch
        #$stdout = execSSH($esxiSSH, "esxcli network vswitch standard remove --vswitch-name=vSwitch$newVSwitch");
        
        #Create Port Groups Based on Switches and Direct Links
        
        my @linkItems = parseSvgForLinks($svgXml);
        foreach my $link (@linkItems)
        {
            #Parse for Group Port Name
            my $portGroupName = "";
            if ($link =~ m/switch/ and $link =~ m/router/)
            {
                #VM to Switch Link
                $link =~ m/(switch\d+)/;
                $portGroupName = parseSvgForSwitchName($svgXml,$1);
            }
            elsif ($link =~ m/router\d+,router\d+/)
            {
                #Direct Link
                $portGroupName = parseSvgForLinkName($svgXml,$link);
            }
            

            my $newEsxiPorGroupName = "vSwitch$newVSwitch-$portGroupName";
            debugPrint('ESXI', 1, "newEsxiPorGroupName = $newEsxiPorGroupName");
            createNewPortGroup($esxiSSH, $newVSwitch, $newEsxiPorGroupName, @vmPortGroups);
        }
    }
    
    #Create Management Port Groups
    my $esxiRouterManagementPortGroupName = "vSwitch$newVSwitch-RouterManagement";
    debugPrint('ESXI', 1, "newEsxiPorGroupName = $esxiRouterManagementPortGroupName");
    createNewPortGroup($esxiSSH, $newVSwitch, $esxiRouterManagementPortGroupName, @vmPortGroups) if $debugExecuteDeployment;
    
    #Deploying VMs
    my @routerIds = parseSvgForRouterIds($svgXml);
    for my $routerId (@routerIds)
    {
        debugPrint('CGI', 2, "routerId = $routerId");
        my $routerText = parseSvgForRouterText($svgXml, $routerId);
        
        #Create SwitchFabric Port Groups
        my $portGroupName = "$routerText-SwitchFabric";
        my $newEsxiPorGroupName = "vSwitch$newVSwitch-$portGroupName";
        debugPrint('ESXI', 1, "newEsxiPorGroupName = $newEsxiPorGroupName");
        createNewPortGroup($esxiSSH, $newVSwitch, $newEsxiPorGroupName, @vmPortGroups) if $debugExecuteDeployment;
        
        #Modify VMX Files
        my $vmName = "CMG-$routerText-SlotA";
        my ($srcOvf, $dstOvf) = ("/var/www/html/burnnotice/ovf/ASender-VMG/ASender-VMG.ovf", "/var/www/html/burnnotice/ovf/ASender-VMG/$vmName.ovf");
        
        #Create list of links
        #First two are always router management and sf
        my @netAdapters = ($esxiRouterManagementPortGroupName, "vSwitch$newVSwitch-$routerText-SwitchFabric");
        foreach my $link (@linkItems)
        {
            if ($link =~ m/$routerId/)
            {
                my $portGroupName = parseSvgForLinkName($svgXml,$link);
                my $newEsxiPorGroupName = "vSwitch$newVSwitch-$portGroupName";
                push(@netAdapters, $newEsxiPorGroupName);
            }
        }
        
        #unlink $dstOvf;
        createNewOvfFile($srcOvf, $dstOvf, @netAdapters );
        
        #Run OVF Tool to ESXi Server
        my $ovftool = "ovftool";
        my $ovftool_args = "";
        
        my $target = "vi://$esxiUser:'$esxiPass'\@$esxiHost/$esxiResourcePath/";
        $ovftool_args = "--overwrite --noSSLVerify --skipManifestCheck --name=\"$vmName\" $dstOvf $target";
        
        
        #Through Web vSphere: ovftool --overwrite --noSSLVerify --skipManifestCheck --name="CMG-R003-SlotA" --datastore="Metalgear Datastore" /var/www/html/burnnotice/ovf/ASender-VMG/CMG-R003-SlotA.ovf vi://asender:'<password>'@networkassurance.gcl.lgsdirect.com/Datacenter/host/metalgear.gcl.lgsdirect.com/Resources/ASender/BurnNotice
        #debugPrint('OVFTOOL', 1, "OVFTOOL cmd: $ovftool $ovftool_args"); 
        if ($debugExecuteDeployment)
        {
            #debugPrint('OVFTOOL', 1, "Deploying VM: $ovftool $ovftool_args"); 
            $stdout = execSSH($ovftoolSSH, "$ovftool $ovftool_args", $esxiPass);
            debugPrint('OVFTOOL', 1, "stdout:\n$stdout");
        }
    }
    
    debugPrint('SSH', 1, "Disconnect SSH Sessions");
    $ovftoolSSH->disconnect();
    $esxiSSH->disconnect();
    
    if ($globalDebugLevel eq 0)
    {
        #automatically go back?
    }
    else
    {
        #print button to go back
        print '<button onclick="window.history.back()">Go Back to Previous</button>' . "\n";
    }
    

sub startNewSSH
{
    my ($host, $user, $pass) = @_;
    debugPrint('SSH', 1, "Connecting over SSH to $host");
    my $ssh = Net::OpenSSH->new($host, user=>$user, password=> $pass, strict_mode => 0, master_opts => [-o => "StrictHostKeyChecking=no"]);
    $ssh->error and die "Couldn't establish SSH connection: ". $ssh->error;
    debugPrint('SSH', 1, "Connected to $host over SSH.");
    return $ssh;
}

sub execSSH
{
    my ($ssh, $cmd) = @_;
    my $localStdout = "";
    my $cleanprint = "In " . $ssh->get_var("HOST") . " executing '$cmd'";
    #$cleanprint =~ s/$password//g;
    
    debugPrint('SSH', 2, $cleanprint);
    $localStdout = $ssh->capture($cmd);
    $ssh->error and print "remote command failed: " . $ssh->error . "\n";
    debugPrint('SSH', 2, "stdout:\n" . $localStdout);
    return $localStdout;
}
    
sub debugPrint
{
    my ($debugType, $debugLevel, $debugString) = @_;
    
    if ($globalDebugLevel <= 0 or $debugLevel <= 0)
    {
        return;
    }
    
    if ($globalDebugLevel >= $debugLevel and ($debugSshTypes{$debugType} or $debugType eq 'ALL'))
    {
        print "$debugString\n";
    }
}

sub startMySqlConnection
{
    my $dsn = "DBI:mysql:database=$mysqlDatabase;host=$mysqlHostname;port=$mysqlPort";
    my $_dbh = DBI->connect($dsn, $mysqlUser, $mysqlPassword);
    return $_dbh;
}

sub queryMySql
{
    my ($_dbh, $sql) = @_;
    my $_sth = $_dbh->prepare($sql) or die "prepare statement failed: $dbh->errstr()";
    $_sth->execute() or die "execution failed: $dbh->errstr()";
    return $_sth;
}

sub parseSvgForLinks
{
    my ($xml) = @_;
    my $xp = XML::XPath->new( xml => $xml );
    my $nodeset = $xp->findnodes_as_string("/svg/g[\@class='linkItem']/\@item-pair"); # find all links
    $nodeset =~ s/"|item-pair=//g;
    my @links = split " ", $nodeset;
    #print "count = " . @links . "\n";
    #foreach my $link (@links) { print "link:$link\n";}
    return @links;
}

sub parseSvgForRouterIds
{
    my ($xml) = @_;
    my $xp = XML::XPath->new( xml => $xml );
    my $nodeset = $xp->findnodes_as_string("/svg/g[\@class='routerItem']/\@id"); # find all routers
    $nodeset =~ s/"|id=//g;
    my @routers = split " ", $nodeset;
    return @routers;
}


sub parseSvgForLinkName
{
    my ($xml, $itemPair) = @_;
    my $xp = XML::XPath->new( xml => $xml );
    my $value = $xp->findvalue("/svg/g[\@item-pair='$itemPair']/text"); # find all links
    return $value;
}

sub parseSvgForRouterText
{
    my ($xml, $routerId) = @_;
    my $xp = XML::XPath->new( xml => $xml );
    my $value = $xp->findvalue("/svg/g[\@id='$routerId']/text"); # find all links
    return $value;
}

sub parseSvgForSwitchName
{
    my ($xml, $switchId) = @_;
    my $xp = XML::XPath->new( xml => $xml );
    my $value = $xp->findvalue("/svg/g[\@id='$switchId']/text"); # find all links
    return $value;
}

sub createNewPortGroup
{
    my ($_esxiSSH, $_newVSwitch, $_newEsxiPorGroupName, @_vmPortGroups) = @_;
    #Check if port group is already created
    my ( $portGroupIndex )= grep { $_vmPortGroups[$_] =~ /$_newEsxiPorGroupName/ } 0..$#_vmPortGroups;
    if (defined $portGroupIndex)
    {
        debugPrint('ESXI', 1, "Port Group '$_newEsxiPorGroupName' already exists");
        debugPrint('ESXI', 1, "portGroupIndex = $portGroupIndex");
    }
    else
    {
        debugPrint('ESXI', 1, "Adding Port Group '$_newEsxiPorGroupName'");
        push @vmPortGroups, $_newEsxiPorGroupName;
        $stdout = execSSH($_esxiSSH, "esxcli network vswitch standard portgroup add    --portgroup-name=$_newEsxiPorGroupName --vswitch-name=vSwitch$_newVSwitch");
        
        #Add VLAN ID
        $vlanLastId++;  #increment to new VLAN ID
        debugPrint('ESXI', 1, "new vlanLastId = $vlanLastId");
        $stdout = execSSH($_esxiSSH, "esxcli network vswitch standard portgroup set -p $_newEsxiPorGroupName --vlan-id $vlanLastId");
        #Remove Port Group
        #$stdout = execSSH($_esxiSSH, "esxcli network vswitch standard portgroup remove --portgroup-name=_$newEsxiPorGroupName --vswitch-name=vSwitch$_newVSwitch");
    }
}


sub createNewOvfFile
{
    my ($_srcOvf, $_dstOvf, @_netAdapters) = @_;
    print "_srcOvf = $_srcOvf\n";
    $/ = undef;
    open OVF_FILE, "<$_srcOvf";
    my $ovf = <OVF_FILE>;
    close OVF_FILE;
    
    my $lastInstanceId = 0;
    my $lastElementName = "";
    my $lastItem = "";
    
    my $prependSpacing = "";
    while ($ovf =~ m/\n(( )*<Item>.*?(\r?\n.*?)*?<\/Item>)/g)
    {
        $lastItem = $1;
        
        #print "lastItem:\n'$lastItem'\n";
    }
    
    $prependSpacing = "      ";
    #print "lastItem:\n'$lastItem'\n";
    my $tagName = "";
    if ($lastItem ne "")
    {
        #print "Found Ethernet Adapter Resource Type\n";
        $tagName = "rasd:InstanceID";
        if ($lastItem =~ m/<$tagName>(.*)<\/$tagName>/)
        {
            $lastInstanceId = $1;
        }
        
        #print "lastInstanceId = $lastInstanceId\n";
        
        my $newItem = "";
        my $newItems = "";
        my $newNetworks = "";
        my $newNetwork = "";
        #import item_network_adapter.ovf
        open OVF_FILE, "../ovf/templates/item_network_adapter.ovf";
        my $netAdapterOvfTemplate = <OVF_FILE>;
        close OVF_FILE;
        $netAdapterOvfTemplate =~ s/\n/\n$prependSpacing/g;
        $netAdapterOvfTemplate = $prependSpacing . $netAdapterOvfTemplate;
        #print "netAdapterOvfTemplate:\n'$netAdapterOvfTemplate'\n";
        
        #import network_section_network.ovf
        open OVF_FILE, "../ovf/templates/network_section_network.ovf";
        my $networkSectionNetworkItemTemplate = <OVF_FILE>;
        close OVF_FILE;
        $networkSectionNetworkItemTemplate =~ s/\n/\n$prependSpacing/g;
        $networkSectionNetworkItemTemplate = $prependSpacing . $networkSectionNetworkItemTemplate;
        #print "networkSectionNetworkItemTemplate:\n'$networkSectionNetworkItemTemplate'\n";
        
        foreach my $netAdapter (@_netAdapters)
        {
            $newNetwork = $networkSectionNetworkItemTemplate;
            $newNetwork =~ s/name=".*"/name="$netAdapter"/;
            
            $newNetworks = $newNetworks . $newNetwork;
            
            $newItem = $netAdapterOvfTemplate;
            $tagName = "rasd:AddressOnParent";
            $newItem =~ s/<$tagName>.*?<\/$tagName>/<$tagName>$lastInstanceId<\/$tagName>/;
            
            $lastInstanceId++;
            $tagName = "rasd:InstanceID";
            $newItem =~ s/<$tagName>.*?<\/$tagName>/<$tagName>$lastInstanceId<\/$tagName>/;
            
            $tagName = "rasd:Connection";
            $newItem =~ s/<$tagName>.*?<\/$tagName>/<$tagName>$netAdapter<\/$tagName>/;
            
            $newItems = $newItems . $newItem;
        }
        
        #Add newItems and newNetworks
        $ovf =~ s/<\/NetworkSection>/$newNetworks\n<\/NetworkSection>/;
        $ovf =~ s/<\/Item>/<\/Item>\n$newItems/;
    }
    
    
    #print $ovf;
    
    open NEW_OVF_FILE, ">", "$_dstOvf";
    print NEW_OVF_FILE $ovf;
    close NEW_OVF_FILE;
}
