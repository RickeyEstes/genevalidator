require 'genevalidator/validation_report'
require 'genevalidator/exceptions'

##
# Class that stores the validation output information
class DuplicationValidationOutput < ValidationReport

  attr_reader :pvalue
  attr_reader :threshold

  def initialize (pvalue, threshold = 0.05, expected = :no)
    @short_header = 'Duplication'
    @header       = 'Duplication'
    @description  = 'Check whether there is a duplicated subsequence in the' \
                    ' predicted gene by counting the hsp residue coverage of' \
                    ' the prediction, for each hit.'
    @pvalue      = pvalue
    @threshold   = threshold
    @result      = validation
    @expected    = expected
    @approach    = "If the query sequence is well conserved and similar" \
                   " sequences (BLAST hits) are correct, we can expect" \
                   " that each region of each BLAST hit to match the" \
                   " query sequence only once. If a region of a BLAST" \
                   " hit sequence matches the query sequence more than" \
                   " once, it would suggest that the region has been" \
                   " erronously duplicated in the query sequence." \
                   " That is to say that ... . "
    @explanation = explain
    @conclusion  = conclude
  end

  def explain
    exp1 = "Here, a p-value of #{@pvalue.round(2)} suggests that the" \
           " average coverage of hit regions is "

    if @result == :yes
      # i.e. if p value is smaller than the threshold...
      exp2 = 'less than 1. This suggests that each region of' \
             ' each homologous hit matches the predicted gene at' \
             ' most once.'
    else
      # i.e. if p value is smaller than the threshold...
      exp2 = 'greater than 1. This can occur if tandem duplicated' \
             ' genes were erroneously included in the same gene model.'
    end
    exp1 + exp2
  end

  def conclude
    if @result == :yes
      return ''
    else
      return ''
    end
  end

  def print
    "#{@pvalue.round(2)}"
  end

  def validation
    (@pvalue > @threshold) ? :no : :yes
  end

  def color
    (validation == :no) ? 'success' : 'danger'
  end
end

##
# This class contains the methods necessary for
# finding duplicated subsequences in the predicted gene
class DuplicationValidation < ValidationTest

  attr_reader :mafft_path
  attr_reader :raw_seq_file
  attr_reader :index_file_name
  attr_reader :raw_seq_file_load

  def initialize(type, prediction, hits, raw_seq_file, index_file_name,
                 raw_seq_file_load, db, num_threads)
    super
    @short_header      = 'Duplication'
    @header            = 'Duplication'
    @description       = 'Check whether there is a duplicated subsequence in' \
                         ' the predicted gene by counting the hsp residue' \
                         ' coverage of the prediction, for each hit.'
    @cli_name          = 'dup'
    @raw_seq_file      = raw_seq_file
    @index_file_name   = index_file_name
    @raw_seq_file_load = raw_seq_file_load
    @db                = db
    @num_threads       = num_threads
  end

  def is_in_range(ranges, idx)
    ranges.each do |range|
      if range.member?(idx)
        return true
      else
        return false
      end
    end
    return false
  end

  ##
  # Check duplication in the first n hits
  # Output:
  # +DuplicationValidationOutput+ object
  def run(n=10)    
    raise NotEnoughHitsError unless hits.length >= 5
    raise Exception unless prediction.is_a? Sequence and
                           prediction.raw_sequence != nil and
                           hits[0].is_a? Sequence

    start = Time.new
    # get the first n hits
    less_hits = @hits[0..[n-1,@hits.length].min]
    useless_hits = []

    # get raw sequences for less_hits
    less_hits.map do |hit|
      #get gene by accession number
      if hit.raw_sequence.nil?

        hit.get_sequence_from_index_file(@raw_seq_file, @index_file_name, hit.identifier, @raw_seq_file_load)

        if hit.raw_sequence.nil? or hit.raw_sequence.empty?
          if hit.type == :protein
            hit.get_sequence_by_accession_no(hit.accession_no, 'protein', @db)
          else
            hit.get_sequence_by_accession_no(hit.accession_no, 'nucleotide', @db)
          end
        end

        if hit.raw_sequence.nil?
          useless_hits.push(hit)
        else
          if hit.raw_sequence.empty?
            useless_hits.push(hit)
          end
        end

      end
    end

    useless_hits.each{|hit| less_hits.delete(hit)}

    if less_hits.length == 0
      raise NoInternetError
    end

    averages = []

    less_hits.each do |hit|
      coverage = Array.new(hit.length_protein,0)
      # each residue of the protein should be evluated once only
      ranges_prediction = []

      hit.hsp_list.each do |hsp|
      # align subsequences from the hit and prediction that match (if it's the case)
        if hsp.hit_alignment != nil and hsp.query_alignment != nil
          hit_alignment   = hsp.hit_alignment
          query_alignment = hsp.query_alignment
        else
          # indexing in blast starts from 1
          hit_local = hit.raw_sequence[hsp.hit_from-1..hsp.hit_to-1]
          query_local = prediction.raw_sequence[hsp.match_query_from-1..hsp.match_query_to-1]

          # in case of nucleotide prediction sequence translate into protein
          # use translate with reading frame 1 because
          # to/from coordinates of the hsp already correspond to the
          # reading frame in which the prediction was read to match this hsp
          if @type == :nucleotide
            s = Bio::Sequence::NA.new(query_local)
            query_local = s.translate
          end

          # local alignment for hit and query
          seqs = [hit_local, query_local]

          begin
            options   = ['--maxiterate', '1000', '--localpair', '--anysymbol', '--quiet',  '--thread', "#{@num_threads}" ]
            mafft     = Bio::MAFFT.new('mafft', options)

            report    = mafft.query_align(seqs)
            raw_align = report.alignment
            align     = []

            raw_align.each { |s| align.push(s.to_s) }
            hit_alignment   = align[0]
            query_alignment = align[1]
          rescue Exception => error
            raise NoMafftInstallationError
          end
        end

        # check multiple coverage

        # for each hsp of the curent hit
        # iterate through the alignment and count the matching residues
        [*(0 .. hit_alignment.length-1)].each do |i|
          residue_hit = hit_alignment[i]
          residue_query = query_alignment[i]
          if residue_hit != ' ' and residue_hit != '+' and residue_hit != '-'
            if residue_hit == residue_query
              # indexing in blast starts from 1
              idx_hit = i + (hsp.hit_from-1) - hit_alignment[0..i].scan(/-/).length
              idx_query = i + (hsp.match_query_from-1) - query_alignment[0..i].scan(/-/).length
              unless is_in_range(ranges_prediction, idx_query)
                coverage[idx_hit] += 1
              end
            end
          end
        end

      ranges_prediction.push((hsp.match_query_from..hsp.match_query_to))

      end
      overlap = coverage.reject{|x| x==0}
      if overlap != []
        averages.push((overlap.inject(:+)/(overlap.length + 0.0)).round(2))
      end
    end

    # if all hsps match only one time
    if averages.reject{|x| x==1} == []
      @validation_report = DuplicationValidationOutput.new(1)
      @validation_report.running_time = Time.now - start
      return @validation_report
    end

    pval = wilcox_test(averages)

    @validation_report = DuplicationValidationOutput.new(pval)
    @running_time = Time.now - start
    return @validation_report

  rescue  NotEnoughHitsError => error
    @validation_report = ValidationReport.new('Not enough evidence', :warning, @short_header, @header, @description, @explanation, @conclusion)
    return @validation_report
  rescue NoMafftInstallationError
    @validation_report = ValidationReport.new('Mafft error', :error, @short_header, @header, @description, @explanation, @conclusion)
    @validation_report.errors.push NoMafftInstallationError
    return @validation_report
  rescue NoInternetError
    @validation_report = ValidationReport.new('Internet error', :error, @short_header, @header, @description, @explanation, @conclusion)
    @validation_report.errors.push NoInternetError
    return @validation_report
  rescue Exception => error
    @validation_report.errors.push OtherError
    @validation_report = ValidationReport.new('Unexpected error', :error, @short_header, @header, @description, @explanation, @conclusion)
    return @validation_report
  end

  ##
  # wilcox test implementation from statsample ruby gem
  # many thanks to Claudio for helping us with the implementation!
  def wilcox_test (averages)
     require 'statsample'
     wilcox = Statsample::Test.wilcoxon_signed_rank(averages.to_scale, Array.new(averages.length,1).to_scale)
     if averages.length < 15
       return wilcox.probability_exact
     else
       return wilcox.probability_z
     end
  end


  ##
  # Calls R to calculate the p value for the wilcoxon-test
  # Input
  # +vector+ Array of values with nonparametric distribution
  def wilcox_test_R (averages)
    require 'rinruby'
    
    original_stdout = $stdout
    original_stderr = $stderr

    $stdout = File.new('/dev/null', 'w')
    $stderr = File.new('/dev/null', 'w')

    R.echo 'enable = nil, stderr = nil, warn = nil'
    #make the wilcox-test and get the p-value
    R.eval("coverageDistrib = c#{averages.to_s.gsub('[','(').gsub(']',')')}")
    R.eval("coverageDistrib = c#{averages.to_s.gsub('[','(').gsub(']',')')}")
    R. eval("pval = wilcox.test(coverageDistrib - 1)$p.value")

    pval = R.pull 'pval'
    $stdout = original_stdout
    $stderr = original_stderr

    return pval
  rescue Exception => error
  end
end
